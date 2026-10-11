import { QueryClient } from "@tanstack/react-query";
import { act } from "@testing-library/react-native";

import {
    decideCommunityJoinRequest,
    deleteCommunity,
    removeCommunityMember,
    updateCommunity,
    updateCommunityMemberRole,
} from "@/api/communities";
import useDecideCommunityJoinRequest from "@/hooks/mutations/useDecideCommunityJoinRequest";
import useDeleteCommunity from "@/hooks/mutations/useDeleteCommunity";
import useRemoveCommunityMember from "@/hooks/mutations/useRemoveCommunityMember";
import useUpdateCommunity from "@/hooks/mutations/useUpdateCommunity";
import useUpdateCommunityMemberRole from "@/hooks/mutations/useUpdateCommunityMemberRole";
import { queryKeys } from "@/lib/queryKeys";
import { CommunityListItem, CommunityMember } from "@/types/community";
import { SearchResults } from "@/types/search";

import {
    makeCommunity,
    makeCommunityDetails,
    makeCommunityMember,
    makeJoinRequest,
    makeSearchResults,
    renderHookWithQueryClient,
} from "../../test/helpers";

jest.mock("@/api/communities", () => ({
    updateCommunity: jest.fn(),
    deleteCommunity: jest.fn(),
    getCommunityRequests: jest.fn(),
    decideCommunityJoinRequest: jest.fn(),
    removeCommunityMember: jest.fn(),
    updateCommunityMemberRole: jest.fn(),
}));

const mockUpdateCommunity = jest.mocked(updateCommunity);
const mockDeleteCommunity = jest.mocked(deleteCommunity);
const mockRemoveCommunityMember = jest.mocked(removeCommunityMember);
const mockUpdateCommunityMemberRole = jest.mocked(updateCommunityMemberRole);
const mockDecideCommunityJoinRequest = jest.mocked(decideCommunityJoinRequest);

beforeEach(() => {
    jest.resetAllMocks();
});

describe("useUpdateCommunity", () => {
    it("patches detail, browse, and search without dropping viewer fields", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useUpdateCommunity()
        );

        const community = makeCommunity({
            id: "c1",
            slug: "c",
            name: "Old name",
            membershipStatus: "joined",
            viewerRole: "admin",
            membersCount: 10,
        });

        queryClient.setQueryData(
            queryKeys.community("c"),
            makeCommunityDetails({ ...community, communityRole: "admin" })
        );
        queryClient.setQueryData(queryKeys.communities(), [community]);
        queryClient.setQueryData(
            queryKeys.search("q"),
            makeSearchResults({ communities: [community] })
        );

        mockUpdateCommunity.mockResolvedValue({
            message: "Community updated successfully",
            data: {
                id: "c1",
                name: "New name",
                slug: "c",
                category: "design",
                description: "Updated description",
                imageUrl: "/images/new.png",
                coverImageUrl: null,
                visibility: "private",
                admin: community.admin,
                membersCount: 12,
                postsCount: 7,
            },
        });

        const input = {
            name: "New name",
            category: "design",
            description: "Updated description",
            visibility: "private" as const,
            image: null,
            coverImage: null,
        };

        await act(async () => {
            await result.current.mutateAsync({
                communityId: "c1",
                slug: "c",
                input,
            });
        });

        expect(mockUpdateCommunity).toHaveBeenCalledWith("c1", input);

        expect(queryClient.getQueryData(queryKeys.community("c"))).toMatchObject({
            name: "New name",
            category: "design",
            visibility: "private",
            membersCount: 12,
            membershipStatus: "joined",
            communityRole: "admin",
        });

        expect(
            queryClient.getQueryData<CommunityListItem[]>(
                queryKeys.communities()
            )?.[0]
        ).toMatchObject({
            name: "New name",
            membersCount: 12,
            membershipStatus: "joined",
            viewerRole: "admin",
        });

        expect(
            queryClient.getQueryData<SearchResults>(queryKeys.search("q"))
                ?.communities[0]
        ).toMatchObject({ name: "New name", membersCount: 12 });
    });
});

describe("useDeleteCommunity", () => {
    it("removes the community and its cached queries", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDeleteCommunity()
        );

        const community = makeCommunity({ id: "c1", slug: "c" });

        queryClient.setQueryData(
            queryKeys.community("c"),
            makeCommunityDetails({ ...community })
        );
        queryClient.setQueryData(queryKeys.communityMembers("c1"), [
            makeCommunityMember(),
        ]);
        queryClient.setQueryData(queryKeys.communities(), [
            community,
            makeCommunity({ id: "c2", slug: "c2" }),
        ]);
        queryClient.setQueryData(queryKeys.userCommunities("me"), [
            { ...community, userRole: "admin" },
        ]);

        mockDeleteCommunity.mockResolvedValue({
            message: "deleted",
            data: { communityId: "c1" },
        });

        await act(async () => {
            await result.current.mutateAsync("c1");
        });

        expect(mockDeleteCommunity).toHaveBeenCalledWith("c1");
        expect(
            queryClient.getQueryData(queryKeys.community("c"))
        ).toBeUndefined();
        expect(
            queryClient.getQueryData(queryKeys.communityMembers("c1"))
        ).toBeUndefined();
        expect(
            queryClient.getQueryData<CommunityListItem[]>(queryKeys.communities())
        ).toHaveLength(1);
        expect(
            queryClient.getQueryData(queryKeys.userCommunities("me"))
        ).toBeUndefined();
    });
});

describe("useRemoveCommunityMember", () => {
    function seedRoster(queryClient: QueryClient) {
        const community = makeCommunity({
            id: "c1",
            slug: "c",
            membersCount: 10,
            membershipStatus: "joined",
            viewerRole: "admin",
        });
        const members = [
            makeCommunityMember({
                membershipId: "m-admin",
                id: "admin-1",
                username: "admin",
                communityRole: "admin",
            }),
            makeCommunityMember({
                membershipId: "m-1",
                id: "u1",
                username: "u1",
                communityRole: "member",
            }),
        ];
        const detail = makeCommunityDetails({
            ...community,
            communityRole: "admin",
            members: [...members],
        });

        queryClient.setQueryData(queryKeys.community("c"), detail);
        queryClient.setQueryData(queryKeys.communityMembers("c1"), [...members]);
        queryClient.setQueryData(queryKeys.communities(), [community]);
        queryClient.setQueryData(
            queryKeys.search("q"),
            makeSearchResults({ communities: [community] })
        );

        return detail;
    }

    it("optimistically removes the member and decrements counts", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useRemoveCommunityMember()
        );
        seedRoster(queryClient);

        mockRemoveCommunityMember.mockResolvedValue({
            message: "removed",
            data: { membership: {} },
        });

        await act(async () => {
            await result.current.mutateAsync({
                communityId: "c1",
                membershipId: "m-1",
                communitySlug: "c",
            });
        });

        expect(mockRemoveCommunityMember).toHaveBeenCalledWith("c1", "m-1");

        expect(
            queryClient
                .getQueryData<CommunityMember[]>(
                    queryKeys.communityMembers("c1")
                )
                ?.map((member) => member.membershipId)
        ).toEqual(["m-admin"]);

        expect(queryClient.getQueryData(queryKeys.community("c"))).toMatchObject({
            membersCount: 9,
        });
        expect(
            queryClient.getQueryData<CommunityListItem[]>(
                queryKeys.communities()
            )?.[0]
        ).toMatchObject({ membersCount: 9 });
        expect(
            queryClient.getQueryData<SearchResults>(queryKeys.search("q"))
                ?.communities[0]
        ).toMatchObject({ membersCount: 9 });
    });

    it("restores the caches when the request fails", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useRemoveCommunityMember()
        );
        const detail = seedRoster(queryClient);

        mockRemoveCommunityMember.mockRejectedValue(new Error("nope"));

        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    communityId: "c1",
                    membershipId: "m-1",
                    communitySlug: "c",
                })
            ).rejects.toThrow("nope");
        });

        expect(
            queryClient.getQueryData(queryKeys.communityMembers("c1"))
        ).toHaveLength(2);
        expect(queryClient.getQueryData(queryKeys.community("c"))).toEqual(detail);
    });
});

describe("useUpdateCommunityMemberRole", () => {
    function seedRoster(queryClient: QueryClient) {
        const members = [
            makeCommunityMember({
                membershipId: "m-1",
                id: "u1",
                username: "u1",
                communityRole: "member",
            }),
            makeCommunityMember({
                membershipId: "m-admin",
                id: "admin-1",
                username: "admin",
                communityRole: "admin",
            }),
        ];

        queryClient.setQueryData(queryKeys.communityMembers("c1"), [...members]);

        return members;
    }

    it("optimistically updates the role and re-sorts members", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useUpdateCommunityMemberRole()
        );
        seedRoster(queryClient);

        mockUpdateCommunityMemberRole.mockResolvedValue({
            message: "updated",
            data: { membership: {} },
        });

        await act(async () => {
            await result.current.mutateAsync({
                communityId: "c1",
                membershipId: "m-1",
                role: "moderator",
            });
        });

        expect(mockUpdateCommunityMemberRole).toHaveBeenCalledWith(
            "c1",
            "m-1",
            "moderator"
        );

        const updated = queryClient.getQueryData<CommunityMember[]>(
            queryKeys.communityMembers("c1")
        );
        expect(updated?.map((member) => member.membershipId)).toEqual([
            "m-admin",
            "m-1",
        ]);
        expect(
            updated?.find((member) => member.membershipId === "m-1")
                ?.communityRole
        ).toBe("moderator");
    });

    it("reverts the role when the request fails", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useUpdateCommunityMemberRole()
        );
        seedRoster(queryClient);

        mockUpdateCommunityMemberRole.mockRejectedValue(new Error("nope"));

        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    communityId: "c1",
                    membershipId: "m-1",
                    role: "moderator",
                })
            ).rejects.toThrow("nope");
        });

        const restored = queryClient.getQueryData<CommunityMember[]>(
            queryKeys.communityMembers("c1")
        );
        expect(restored?.map((member) => member.membershipId)).toEqual([
            "m-1",
            "m-admin",
        ]);
        expect(
            restored?.find((member) => member.membershipId === "m-1")
                ?.communityRole
        ).toBe("member");
    });
});

describe("useDecideCommunityJoinRequest", () => {
    function seedRequest(queryClient: QueryClient) {
        const community = makeCommunity({ id: "c1", slug: "c", membersCount: 10 });
        const request = makeJoinRequest({
            id: "r1",
            user: {
                id: "u9",
                name: "Nine",
                username: "nine",
                jobTitle: null,
                avatarUrl: null,
            },
        });

        queryClient.setQueryData(
            queryKeys.community("c"),
            makeCommunityDetails({ ...community, communityRole: "admin" })
        );
        queryClient.setQueryData(queryKeys.communityMembers("c1"), [
            makeCommunityMember({
                membershipId: "m-admin",
                id: "admin-1",
                username: "admin",
                communityRole: "admin",
            }),
        ]);
        queryClient.setQueryData(queryKeys.communityRequests("c1"), [request]);
        queryClient.setQueryData(queryKeys.communities(), [community]);
        queryClient.setQueryData(
            queryKeys.search("q"),
            makeSearchResults({ communities: [community] })
        );

        return request;
    }

    it("accepts a request, adds the member, and bumps counts", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDecideCommunityJoinRequest()
        );
        const request = seedRequest(queryClient);

        mockDecideCommunityJoinRequest.mockResolvedValue({
            message: "accepted",
            data: {
                membership: { id: "ms-9", role: "member" },
                request: { id: "r1", status: "approved" },
            },
        });

        await act(async () => {
            await result.current.mutateAsync({
                community: { id: "c1", slug: "c" },
                request,
                decision: "approve",
            });
        });

        expect(mockDecideCommunityJoinRequest).toHaveBeenCalledWith(
            "c1",
            "r1",
            "approve"
        );
        expect(
            queryClient.getQueryData(queryKeys.communityRequests("c1"))
        ).toHaveLength(0);

        const members = queryClient.getQueryData<CommunityMember[]>(
            queryKeys.communityMembers("c1")
        );
        expect(members?.find((member) => member.id === "u9")).toMatchObject({
            username: "nine",
            communityRole: "member",
            membershipId: "ms-9",
        });

        expect(queryClient.getQueryData(queryKeys.community("c"))).toMatchObject({
            membersCount: 11,
        });
        expect(
            queryClient.getQueryData<CommunityListItem[]>(
                queryKeys.communities()
            )?.[0]
        ).toMatchObject({ membersCount: 11 });
        expect(
            queryClient.getQueryData<SearchResults>(queryKeys.search("q"))
                ?.communities[0]
        ).toMatchObject({ membersCount: 11 });
    });

    it("rejects a request without adding a member", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDecideCommunityJoinRequest()
        );
        const request = seedRequest(queryClient);

        mockDecideCommunityJoinRequest.mockResolvedValue({
            message: "rejected",
            data: {
                membership: null,
                request: { id: "r1", status: "rejected" },
            },
        });

        await act(async () => {
            await result.current.mutateAsync({
                community: { id: "c1", slug: "c" },
                request,
                decision: "reject",
            });
        });

        expect(
            queryClient.getQueryData(queryKeys.communityRequests("c1"))
        ).toHaveLength(0);
        expect(
            queryClient.getQueryData<CommunityMember[]>(
                queryKeys.communityMembers("c1")
            )
        ).toHaveLength(1);
        expect(queryClient.getQueryData(queryKeys.community("c"))).toMatchObject({
            membersCount: 10,
        });
    });

    it("restores the caches when the decision fails", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDecideCommunityJoinRequest()
        );
        const request = seedRequest(queryClient);

        mockDecideCommunityJoinRequest.mockRejectedValue(new Error("nope"));

        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    community: { id: "c1", slug: "c" },
                    request,
                    decision: "approve",
                })
            ).rejects.toThrow("nope");
        });

        expect(
            queryClient.getQueryData(queryKeys.communityRequests("c1"))
        ).toEqual([request]);
        expect(
            queryClient.getQueryData<CommunityMember[]>(
                queryKeys.communityMembers("c1")
            )
        ).toHaveLength(1);
        expect(queryClient.getQueryData(queryKeys.community("c"))).toMatchObject({
            membersCount: 10,
        });
    });
});
