import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";

import { decideCommunityJoinRequest } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";
import {
    CommunityDetails,
    CommunityJoinRequest,
    CommunityListItem,
    CommunityMember,
} from "@/types/community";

type DecideVars = {
    community: Pick<CommunityDetails, "id" | "slug">;
    request: CommunityJoinRequest;
    decision: "approve" | "reject";
};

const ROLE_RANK: Record<string, number> = {
    admin: 0,
    moderator: 1,
    member: 2,
};

function withBumpedCount<T extends { id: string; membersCount: number }>(
    community: T,
    communityId: string,
    delta: number
): T {
    if (community.id !== communityId) return community;

    return {
        ...community,
        membersCount: Math.max(0, community.membersCount + delta),
    };
}

export default function useDecideCommunityJoinRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ community, request, decision }: DecideVars) =>
            decideCommunityJoinRequest(community.id, request.id, decision),

        onMutate: async ({ community, request, decision }) => {
            await queryClient.cancelQueries();

            const snapshots: [QueryKey, unknown][] =
                queryClient.getQueriesData({ predicate: () => true });

            queryClient.setQueryData<CommunityJoinRequest[]>(
                queryKeys.communityRequests(community.id),
                (old = []) => old.filter((entry) => entry.id !== request.id)
            );

            if (decision === "approve") {
                queryClient.setQueryData<CommunityMember[]>(
                    queryKeys.communityMembers(community.id),
                    (old = []) => {
                        if (old.some((m) => m.id === request.user.id)) return old;

                        const newMember: CommunityMember = {
                            membershipId: `pending-${request.user.id}`,
                            id: request.user.id,
                            name: request.user.name,
                            username: request.user.username,
                            jobTitle: request.user.jobTitle,
                            avatarUrl: request.user.avatarUrl,
                            location: null,
                            communityRole: "member",
                            joinedAt: request.createdAt,
                        };

                        return [...old, newMember].sort(
                            (a, b) =>
                                (ROLE_RANK[a.communityRole] ?? 3) -
                                (ROLE_RANK[b.communityRole] ?? 3)
                        );
                    }
                );

                queryClient.setQueryData<CommunityDetails>(
                    queryKeys.community(community.slug),
                    (old) =>
                        old ? withBumpedCount(old, community.id, 1) : old
                );

                queryClient.setQueryData<CommunityListItem[]>(
                    queryKeys.communities(),
                    (old) =>
                        old?.map((entry) =>
                            withBumpedCount(entry, community.id, 1)
                        )
                );

                queryClient.setQueriesData<{
                    communities?: CommunityListItem[];
                }>({ queryKey: ["search"] }, (old) =>
                    old?.communities
                        ? {
                              ...old,
                              communities: old.communities.map((entry) =>
                                  withBumpedCount(entry, community.id, 1)
                              ),
                          }
                        : old
                );
            }

            return { snapshots };
        },

        onError: (_error, _variables, context) => {
            context?.snapshots.forEach(([key, value]) => {
                queryClient.setQueryData(key, value);
            });
        },

        onSuccess: (response, variables) => {
            if (variables.decision === "approve") {
                const membership = response.data.membership;

                if (membership) {
                    queryClient.setQueryData<CommunityMember[]>(
                        queryKeys.communityMembers(variables.community.id),
                        (old = []) =>
                            old.map((member) =>
                                member.id === variables.request.user.id
                                    ? { ...member, membershipId: membership.id }
                                    : member
                            )
                    );
                }
            }
        },
    });
}
