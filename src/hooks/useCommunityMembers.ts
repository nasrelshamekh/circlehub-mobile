import { useQuery } from "@tanstack/react-query";

import { getCommunityMembers } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/types/api";
import { CommunityMember } from "@/types/community";

const ROLE_RANK: Record<string, number> = {
    admin: 0,
    moderator: 1,
    member: 2,
};

export function useCommunityMembers(communityId: string | undefined) {
    const query = useQuery<CommunityMember[]>({
        queryKey: queryKeys.communityMembers(communityId ?? "unknown"),
        queryFn: async () => {
            try {
                const { data } = await getCommunityMembers(communityId ?? "");
                return [...data].sort(
                    (a, b) =>
                        (ROLE_RANK[a.communityRole] ?? 3) -
                        (ROLE_RANK[b.communityRole] ?? 3)
                );
            } catch (error) {
                if (error instanceof ApiError && error.status === 403) return [];
                throw error;
            }
        },
        enabled: Boolean(communityId),
    });

    return {
        members: query.data ?? [],
        isLoading: query.isPending && Boolean(communityId),
    };
}
