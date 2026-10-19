import { act } from "@testing-library/react-native";

import { joinCommunity, leaveCommunity } from "@/api/communities";
import { followUser, unfollowUser } from "@/api/users";
import { useAuth } from "@/context/authcontext";
import useToggleCommunityMembership from "@/hooks/mutations/useToggleCommunityMembership";
import useToggleFollow from "@/hooks/mutations/useToggleFollow";
import { queryKeys } from "@/lib/queryKeys";
import { CommunityListItem } from "@/types/community";
import { SearchResults } from "@/types/search";
import { FollowUser } from "@/types/user";

import {
    makeCommunity,
    makeCommunityDetails,
    makeFollowUser,
    makeSearchResults,
    makeSearchUser,
    makeUser,
    makeUserProfile,
    renderHookWithQueryClient,
} from "../../test/helpers";

jest.mock("@/api/users", () => ({
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
}));

jest.mock("@/api/communities", () => ({
    joinCommunity: jest.fn(),
    leaveCommunity: jest.fn(),
}));

jest.mock("@/context/authcontext", () => ({ useAuth: jest.fn() }));

const mockFollowUser = jest.mocked(followUser);
const mockUnfollowUser = jest.mocked(unfollowUser);
const mockJoinCommunity = jest.mocked(joinCommunity);
const mockLeaveCommunity = jest.mocked(leaveCommunity);
const mockUseAuth = jest.mocked(useAuth);

beforeEach(() => {
    jest.resetAllMocks();

    mockUseAuth.mockReturnValue({
        status: "authenticated",
        user: makeUser({ id: "me-id", username: "me" }),
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateUser: jest.fn(),
    });
});

describe("useToggleFollow", () => {
    it("follows optimistically and invalidates the follow lists", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleFollow()
        );

        queryClient.setQueryData(
            queryKeys.user("target"),
            makeUserProfile({
                id: "target-id",
                username: "target",
                followersCount: 10,
                isFollowedByMe: false,
            })
        );
        queryClient.setQueryData(
            queryKeys.user("me"),
            makeUserProfile({ id: "me-id", username: "me", followingCount: 4 })
        );
        queryClient.setQueryData(
            queryKeys.search("q"),
            makeSearchResults({
                users: [
                    makeSearchUser({
                        id: "target-id",
                        username: "target",
                        followersCount: 10,
                        isFollowedByMe: false,
                    }),
                ],
            })
        );

        const spy = jest.spyOn(queryClient, "invalidateQueries");
        mockFollowUser.mockResolvedValue({ message: "followed" });

        await act(async () => {
            await result.current.mutateAsync({
                userId: "target-id",
                shouldFollow: true,
                targetUsername: "target",
            });
        });

        expect(mockFollowUser).toHaveBeenCalledWith("target-id");
        expect(queryClient.getQueryData(queryKeys.user("target"))).toMatchObject(
            { isFollowedByMe: true, followersCount: 11 }
        );
        expect(queryClient.getQueryData(queryKeys.user("me"))).toMatchObject({
            followingCount: 5,
        });
        expect(
            queryClient.getQueryData<SearchResults>(queryKeys.search("q"))
                ?.users[0]
        ).toMatchObject({ isFollowedByMe: true, followersCount: 11 });

        expect(spy).toHaveBeenCalledWith({
            queryKey: queryKeys.userFollowers("target"),
        });
        expect(spy).toHaveBeenCalledWith({
            queryKey: queryKeys.userFollowing("me"),
        });
    });

    it("unfollows optimistically and drops the user from the follow lists", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleFollow()
        );

        queryClient.setQueryData(
            queryKeys.user("target"),
            makeUserProfile({
                id: "target-id",
                username: "target",
                followersCount: 10,
                isFollowedByMe: true,
            })
        );
        queryClient.setQueryData(
            queryKeys.user("me"),
            makeUserProfile({ id: "me-id", username: "me", followingCount: 4 })
        );
        queryClient.setQueryData(queryKeys.userFollowing("me"), [
            makeFollowUser({ id: "target-id", username: "target" }),
        ]);
        queryClient.setQueryData(queryKeys.userFollowers("target"), [
            makeFollowUser({ id: "me-id", username: "me" }),
        ]);

        mockUnfollowUser.mockResolvedValue({ message: "unfollowed" });

        await act(async () => {
            await result.current.mutateAsync({
                userId: "target-id",
                shouldFollow: false,
                targetUsername: "target",
            });
        });

        expect(mockUnfollowUser).toHaveBeenCalledWith("target-id");
        expect(queryClient.getQueryData(queryKeys.user("target"))).toMatchObject(
            { isFollowedByMe: false, followersCount: 9 }
        );
        expect(queryClient.getQueryData(queryKeys.user("me"))).toMatchObject({
            followingCount: 3,
        });
        expect(
            queryClient.getQueryData<FollowUser[]>(queryKeys.userFollowing("me"))
        ).toHaveLength(0);
        expect(
            queryClient.getQueryData<FollowUser[]>(
                queryKeys.userFollowers("target")
            )
        ).toHaveLength(0);
    });

    it("restores the follow caches when the request fails", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleFollow()
        );

        const target = makeUserProfile({
            id: "target-id",
            username: "target",
            followersCount: 10,
            isFollowedByMe: false,
        });
        const me = makeUserProfile({
            id: "me-id",
            username: "me",
            followingCount: 4,
        });

        queryClient.setQueryData(queryKeys.user("target"), target);
        queryClient.setQueryData(queryKeys.user("me"), me);

        mockFollowUser.mockRejectedValue(new Error("nope"));

        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    userId: "target-id",
                    shouldFollow: true,
                    targetUsername: "target",
                })
            ).rejects.toThrow("nope");
        });

        expect(queryClient.getQueryData(queryKeys.user("target"))).toEqual(
            target
        );
        expect(queryClient.getQueryData(queryKeys.user("me"))).toEqual(me);
    });
});

describe("useToggleCommunityMembership", () => {
    it("joins a public community across detail, browse, and search", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleCommunityMembership()
        );

        const community = makeCommunity({
            id: "c1",
            slug: "c",
            visibility: "public",
            membershipStatus: "not_joined",
            viewerRole: null,
            membersCount: 10,
        });

        queryClient.setQueryData(
            queryKeys.community("c"),
            makeCommunityDetails({ ...community })
        );
        queryClient.setQueryData(queryKeys.communities(), [community]);
        queryClient.setQueryData(queryKeys.communityCategories(), [community]);
        queryClient.setQueryData(queryKeys.communityMembers("c1"), [
            { id: "m1" },
        ]);
        queryClient.setQueryData(
            queryKeys.search("q"),
            makeSearchResults({ communities: [community] })
        );

        const spy = jest.spyOn(queryClient, "invalidateQueries");
        mockJoinCommunity.mockResolvedValue({
            message: "joined",
            data: { membershipStatus: "joined", communityRole: "member" },
        });

        await act(async () => {
            await result.current.mutateAsync({ community });
        });

        expect(mockJoinCommunity).toHaveBeenCalledWith("c1");
        expect(queryClient.getQueryData(queryKeys.community("c"))).toMatchObject(
            {
                membershipStatus: "joined",
                communityRole: "member",
                membersCount: 11,
            }
        );
        expect(
            queryClient.getQueryData<CommunityListItem[]>(queryKeys.communities())
                ?.[0]
        ).toMatchObject({
            membershipStatus: "joined",
            viewerRole: "member",
            membersCount: 11,
        });
        expect(
            queryClient.getQueryData<SearchResults>(queryKeys.search("q"))
                ?.communities[0]
        ).toMatchObject({ membershipStatus: "joined", membersCount: 11 });

        expect(
            queryClient.getQueryData<CommunityListItem[]>(
                queryKeys.communityCategories()
            )?.[0]
        ).toMatchObject({ membershipStatus: "not_joined", membersCount: 10 });
        expect(
            queryClient.getQueryData(queryKeys.communityMembers("c1"))
        ).toEqual([{ id: "m1" }]);

        expect(spy).toHaveBeenCalledWith({
            queryKey: queryKeys.userCommunities("me"),
        });
        expect(spy).toHaveBeenCalledWith({ queryKey: ["community"] });
        expect(spy).toHaveBeenCalledWith({ queryKey: ["search"] });
        expect(spy).toHaveBeenCalledWith({
            queryKey: queryKeys.communities(),
            exact: true,
        });
    });

    it("requests to join a private community", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleCommunityMembership()
        );

        const community = makeCommunity({
            id: "c1",
            slug: "c",
            visibility: "private",
            membershipStatus: "not_joined",
            membersCount: 10,
        });

        queryClient.setQueryData(
            queryKeys.community("c"),
            makeCommunityDetails({ ...community })
        );

        mockJoinCommunity.mockResolvedValue({
            message: "requested",
            data: { membershipStatus: "requested", communityRole: null },
        });

        await act(async () => {
            await result.current.mutateAsync({ community });
        });

        expect(queryClient.getQueryData(queryKeys.community("c"))).toMatchObject(
            {
                membershipStatus: "requested",
                communityRole: null,
                membersCount: 10,
            }
        );
    });

    it("leaves a joined community and decrements the member count", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleCommunityMembership()
        );

        const community = makeCommunity({
            id: "c1",
            slug: "c",
            visibility: "public",
            membershipStatus: "joined",
            viewerRole: "member",
            membersCount: 10,
        });

        queryClient.setQueryData(
            queryKeys.community("c"),
            makeCommunityDetails({ ...community })
        );

        mockLeaveCommunity.mockResolvedValue({
            message: "left",
            data: { membershipStatus: "not_joined", communityRole: null },
        });

        await act(async () => {
            await result.current.mutateAsync({ community });
        });

        expect(mockLeaveCommunity).toHaveBeenCalledWith("c1");
        expect(queryClient.getQueryData(queryKeys.community("c"))).toMatchObject(
            {
                membershipStatus: "not_joined",
                communityRole: null,
                membersCount: 9,
            }
        );
    });

    it("restores the community caches when the request fails", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleCommunityMembership()
        );

        const community = makeCommunity({
            id: "c1",
            slug: "c",
            visibility: "public",
            membershipStatus: "not_joined",
            membersCount: 10,
        });
        const details = makeCommunityDetails({ ...community });
        const browse = [community];

        queryClient.setQueryData(queryKeys.community("c"), details);
        queryClient.setQueryData(queryKeys.communities(), browse);

        mockJoinCommunity.mockRejectedValue(new Error("nope"));

        await act(async () => {
            await expect(
                result.current.mutateAsync({ community })
            ).rejects.toThrow("nope");
        });

        expect(queryClient.getQueryData(queryKeys.community("c"))).toEqual(
            details
        );
        expect(queryClient.getQueryData(queryKeys.communities())).toEqual(
            browse
        );
    });
});
