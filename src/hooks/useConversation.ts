import { useQuery } from "@tanstack/react-query";

import { getConversation } from "@/api/messages";
import { queryKeys } from "@/lib/queryKeys";

export function useConversation(id: string) {
    const query = useQuery({
        queryKey: queryKeys.conversation(id),
        queryFn: async () => {
            const { data } = await getConversation(id);
            return data;
        },
        enabled: Boolean(id),
    });

    return {
        conversation: query.data,
        messages: query.data?.messages ?? [],
        otherUser: query.data?.otherUser,
        hasMore: query.data?.hasMore ?? false,
        isLoading: query.isPending && Boolean(id),
        error: query.error,
    };
}
