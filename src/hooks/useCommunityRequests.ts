import { useQuery } from "@tanstack/react-query";

import { getCommunityRequests } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/types/api";
import { CommunityJoinRequest } from "@/types/community";

export function useCommunityRequests(communityId: string | undefined) {
    const query = useQuery<CommunityJoinRequest[]>({
        queryKey: queryKeys.communityRequests(communityId ?? "unknown"),
        queryFn: async () => {
            try {
                const { data } = await getCommunityRequests(communityId ?? "");
                return data;
            } catch (error) {
                if (error instanceof ApiError && error.status === 403) return [];
                throw error;
            }
        },
        enabled: Boolean(communityId),
    });

    return {
        requests: query.data ?? [],
        isLoading: query.isPending && Boolean(communityId),
    };
}
