import { useQuery } from "@tanstack/react-query";

import { getCommunityBySlug } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/types/api";
import { CommunityDetails } from "@/types/community";

export function useCommunityDetails(slug: string | undefined) {
    const query = useQuery<CommunityDetails | null>({
        queryKey: queryKeys.community(slug ?? "unknown"),
        queryFn: async () => {
            try {
                const { data } = await getCommunityBySlug(slug ?? "");
                return data;
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) return null;
                throw error;
            }
        },
        enabled: Boolean(slug),
    });

    return {
        community: query.data ?? null,
        isLoading: query.isPending && Boolean(slug),
    };
}
