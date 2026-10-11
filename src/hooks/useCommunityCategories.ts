import { useQuery } from "@tanstack/react-query";

import { getCommunityCategories } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";

export function useCommunityCategories() {
    const query = useQuery({
        queryKey: queryKeys.communityCategories(),
        queryFn: async () => {
            const { data } = await getCommunityCategories();
            return data;
        },
        staleTime: Infinity,
    });

    return {
        categories: query.data ?? [],
        isLoading: query.isPending,
    };
}
