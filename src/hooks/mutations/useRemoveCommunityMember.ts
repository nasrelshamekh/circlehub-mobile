import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";

import { removeCommunityMember } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";
import {
    CommunityDetails,
    CommunityListItem,
    CommunityMember,
} from "@/types/community";

type RemoveMemberVars = {
    communityId: string;
    membershipId: string;
    communitySlug: string;
};

function withDecrementedCount<T extends { id: string; membersCount: number }>(
    community: T,
    communityId: string
): T {
    if (community.id !== communityId) return community;

    return {
        ...community,
        membersCount: Math.max(0, community.membersCount - 1),
    };
}

export default function useRemoveCommunityMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ communityId, membershipId }: RemoveMemberVars) =>
            removeCommunityMember(communityId, membershipId),

        onMutate: async ({ communityId, membershipId, communitySlug }) => {
            await queryClient.cancelQueries();

            const snapshots: [QueryKey, unknown][] =
                queryClient.getQueriesData({ predicate: () => true });

            queryClient.setQueryData<CommunityMember[]>(
                queryKeys.communityMembers(communityId),
                (old) => old?.filter((m) => m.membershipId !== membershipId)
            );

            queryClient.setQueryData<CommunityDetails>(
                queryKeys.community(communitySlug),
                (old) =>
                    old ? withDecrementedCount(old, communityId) : old
            );

            queryClient.setQueryData<CommunityListItem[]>(
                queryKeys.communities(),
                (old) =>
                    old?.map((community) =>
                        withDecrementedCount(community, communityId)
                    )
            );

            queryClient.setQueriesData<{ communities?: CommunityListItem[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.communities
                        ? {
                              ...old,
                              communities: old.communities.map((community) =>
                                  withDecrementedCount(community, communityId)
                              ),
                          }
                        : old
            );

            return { snapshots };
        },

        onError: (_error, _variables, context) => {
            context?.snapshots.forEach(([key, value]) => {
                queryClient.setQueryData(key, value);
            });
        },
    });
}
