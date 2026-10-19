import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";

import { joinCommunity, leaveCommunity } from "@/api/communities";
import { useAuth } from "@/context/authcontext";
import { queryKeys } from "@/lib/queryKeys";
import {
    CommunityDetails,
    CommunityListItem,
    CommunityMembershipStatus,
} from "@/types/community";

type MembershipTarget = Pick<
    CommunityListItem,
    "id" | "slug" | "visibility" | "membershipStatus" | "membersCount"
>;

export default function useToggleCommunityMembership() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: ({ community }: { community: MembershipTarget }) => {
            const shouldLeave = ["joined", "requested"].includes(
                community.membershipStatus
            );

            return shouldLeave
                ? leaveCommunity(community.id)
                : joinCommunity(community.id);
        },

        onMutate: async ({ community }) => {
            await queryClient.cancelQueries();

            const snapshots: [QueryKey, unknown][] =
                queryClient.getQueriesData({ predicate: () => true });

            const wasJoined = community.membershipStatus === "joined";
            const wasRequested = community.membershipStatus === "requested";
            const isPublic = community.visibility === "public";

            let membershipStatus: CommunityMembershipStatus;
            let viewerRole: string | null = null;
            let countDelta = 0;

            if (wasJoined) {
                membershipStatus = "not_joined";
                countDelta = -1;
            } else if (wasRequested) {
                membershipStatus = "not_joined";
            } else if (isPublic) {
                membershipStatus = "joined";
                viewerRole = "member";
                countDelta = 1;
            } else {
                membershipStatus = "requested";
            }

            queryClient.setQueriesData<CommunityDetails>(
                {
                    predicate: (query) =>
                        query.queryKey[0] === "community" &&
                        query.queryKey.length === 2,
                },
                (old) =>
                    old && old.id === community.id
                        ? {
                              ...old,
                              membershipStatus,
                              communityRole: viewerRole,
                              membersCount: Math.max(
                                  0,
                                  old.membersCount + countDelta
                              ),
                          }
                        : old
            );

            queryClient.setQueriesData<{ communities?: CommunityListItem[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.communities
                        ? {
                              ...old,
                              communities: old.communities.map((entry) =>
                                  entry.id === community.id
                                      ? {
                                            ...entry,
                                            membershipStatus,
                                            viewerRole,
                                            membersCount: Math.max(
                                                0,
                                                entry.membersCount + countDelta
                                            ),
                                        }
                                      : entry
                              ),
                          }
                        : old
            );

            queryClient.setQueriesData<CommunityListItem[]>(
                {
                    predicate: (query) =>
                        query.queryKey[0] === "communities" &&
                        query.queryKey.length === 1,
                },
                (old) =>
                    old?.map((entry) =>
                        entry.id === community.id
                            ? {
                                  ...entry,
                                  membershipStatus,
                                  viewerRole,
                                  membersCount: Math.max(
                                      0,
                                      entry.membersCount + countDelta
                                  ),
                              }
                            : entry
                    )
            );

            return { snapshots };
        },

        onError: (_error, _variables, context) => {
            context?.snapshots.forEach(([key, value]) => {
                queryClient.setQueryData(key, value);
            });
        },

        onSettled: () => {
            if (user?.username) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.userCommunities(user.username),
                });
            }

            queryClient.invalidateQueries({ queryKey: ["community"] });
            queryClient.invalidateQueries({ queryKey: ["search"] });

            queryClient.invalidateQueries({
                queryKey: queryKeys.communities(),
                exact: true,
            });
        },
    });
}
