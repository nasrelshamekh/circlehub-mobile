import { useQuery } from "@tanstack/react-query";

import { getConversations } from "@/api/messages";
import { queryKeys } from "@/lib/queryKeys";
import { decryptMessageContent, peekDecrypted } from "@/services/messageCrypto";
import { Conversation } from "@/types/message";

const STALE_TIME_MS = 1000 * 60;

function warmConversationPreviews(conversations: Conversation[]): void {
    const uncached = conversations
        .map((c) => c?.lastMessage?.content)
        .filter((c): c is string => Boolean(c) && peekDecrypted(c) === null);

    if (uncached.length === 0) return;

    let index = 0;
    const step = () => {
        if (index >= uncached.length) return;
        const cipher = uncached[index];
        index += 1;
        void decryptMessageContent(cipher)
            .catch(() => undefined)
            .finally(() => {
                if (index < uncached.length) {
                    setTimeout(step, 8);
                }
            });
    };

    setTimeout(step, 0);
}

export function useConversations() {
    const query = useQuery({
        queryKey: queryKeys.conversations(),
        queryFn: async () => {
            const { data } = await getConversations();
            if (Array.isArray(data) && data.length > 0) {
                warmConversationPreviews(data);
            }
            return data;
        },
        staleTime: STALE_TIME_MS,
    });

    return {
        conversations: query.data ?? [],
        isLoading: query.isPending,
        isRefetching: query.isRefetching,
        refetch: query.refetch,
        error: query.error,
    };
}
