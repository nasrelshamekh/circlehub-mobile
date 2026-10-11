import { useQuery } from "@tanstack/react-query";

import { getCommunities } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";

export function useCommunities() {
    const query = useQuery({
        queryKey: queryKeys.communities(),
        queryFn: async () => {
            const { data } = await getCommunities();
            return data;
        },
    });

    return {
        communities: query.data ?? [],
        isLoading: query.isPending,
        refetch: query.refetch,
    };
}
