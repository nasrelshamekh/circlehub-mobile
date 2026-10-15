import { useQuery } from "@tanstack/react-query";

import { getConversations } from "@/api/messages";
import { queryKeys } from "@/lib/queryKeys";

export function useConversations() {
    const query = useQuery({
        queryKey: queryKeys.conversations(),
        queryFn: async () => {
            const { data } = await getConversations();
            return data;
        },
    });

    return {
        conversations: query.data ?? [],
        isLoading: query.isPending,
        isRefetching: query.isRefetching,
        refetch: query.refetch,
        error: query.error,
    };
}
