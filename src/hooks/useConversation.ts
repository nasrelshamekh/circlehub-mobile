import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { getConversation } from "@/api/messages";
import { mergeConversationPages } from "@/lib/messagePages";
import { queryKeys } from "@/lib/queryKeys";

const PAGE_SIZE = 50;

export function useConversation(id: string) {
    const queryClient = useQueryClient();

    const query = useInfiniteQuery({
        queryKey: queryKeys.conversation(id),
        queryFn: async ({ pageParam }) => {
            const { data } = await getConversation(id, pageParam, PAGE_SIZE);
            return data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, pages) =>
            lastPage.hasMore ? pages.length + 1 : undefined,
        enabled: Boolean(id),
    });

    const pages = query.data?.pages;

    const messages = useMemo(
        () => (pages ? mergeConversationPages(pages) : []),
        [pages]
    );

    const hasLoadedPages = Boolean(pages);
    const newestMessageId = messages[messages.length - 1]?.id ?? null;
    const messageCount = messages.length;

    useEffect(() => {
        if (!hasLoadedPages) return;
        void queryClient.invalidateQueries({
            queryKey: queryKeys.conversations(),
        });
    }, [hasLoadedPages, newestMessageId, messageCount, queryClient]);

    function loadOlder() {
        if (!query.hasNextPage || query.isFetchingNextPage) return;

        void query.fetchNextPage();
    }

    return {
        conversation: pages?.[0],
        messages,
        otherUser: pages?.[0]?.otherUser,
        hasMore: Boolean(query.hasNextPage),
        isLoadingOlder: query.isFetchingNextPage,
        loadOlder,
        isLoading: query.isPending && Boolean(id),
        error: query.error,
    };
}
