import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

import { getConversation } from "@/api/messages";
import { mergeConversationPages } from "@/lib/messagePages";
import { queryKeys } from "@/lib/queryKeys";
import { decryptMessageContent, peekDecrypted } from "@/services/messageCrypto";
import { ConversationThread } from "@/types/message";

const PAGE_SIZE = 50;
const STALE_TIME_MS = 1000 * 30;

export async function fetchConversationThread(
    id: string,
    pageParam = 1,
    pageSize = PAGE_SIZE
): Promise<ConversationThread> {
    const { data } = await getConversation(id, pageParam, pageSize);
    if (data?.messages && data.messages.length > 0) {
        // Synchronously attach any plaintexts already cached in settledCache
        for (const m of data.messages) {
            const cached = peekDecrypted(m.content);
            if (cached !== null) {
                m.plaintext = cached;
            }
        }
        // Decrypt all messages in parallel for instant display like Instagram
        await Promise.allSettled(
            data.messages.map(async (m: any) => {
                if (m.plaintext || !m.content) return;
                if (peekDecrypted(m.content) !== null) {
                    const c = peekDecrypted(m.content);
                    if (c) m.plaintext = c;
                    return;
                }
                try {
                    const text = await decryptMessageContent(m.content);
                    if (text && text !== "[Can't decrypt this message]") {
                        m.plaintext = text;
                    } else if (text) {
                        m.plaintext = text;
                    }
                } catch {
                    // ignore
                }
            })
        );
    }
    return data;
}

/**
 * The options every read of one conversation goes through — the hook that opens the thread and the
 * prewarm the conversation list starts when a row is touched.
 *
 * They have to agree on everything, because React Query keeps ONE query per key and
 * `prefetchInfiniteQuery` *replaces* that query's options with the ones it is handed. A prefetch
 * that left out `getNextPageParam` therefore stripped it off the shared query, and the
 * infinite-query behaviour — which calls `options.getNextPageParam(...)` to walk to the next page
 * when it refetches a thread that already holds more than one page — threw
 * "undefined is not a function". The failure landed in the query state, so the thread screen
 * rendered "Could not load this conversation." for a conversation that was perfectly readable.
 *
 * One factory, used by both callers, is what keeps that from drifting apart again.
 */
export function conversationQueryOptions(id: string) {
    return {
        queryKey: queryKeys.conversation(id),
        queryFn: ({ pageParam }: { pageParam?: number }) =>
            fetchConversationThread(id, pageParam ?? 1, PAGE_SIZE),
        initialPageParam: 1,
        getNextPageParam: (
            lastPage: ConversationThread,
            pages: ConversationThread[]
        ) => (lastPage?.hasMore ? pages.length + 1 : undefined),
        staleTime: STALE_TIME_MS,
    };
}

export function useConversation(
    id: string,
    hookOptions?: { enabled?: boolean }
) {
    const queryClient = useQueryClient();
    const isEnabled = Boolean(id) && (hookOptions?.enabled ?? true);

    const options = useMemo(
        () => ({ ...conversationQueryOptions(id), enabled: isEnabled }),
        [id, isEnabled]
    );

    const query = useInfiniteQuery(options);

    const {
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        refetch,
    } = query;

    const pages = query.data?.pages;

    const messages = useMemo(
        () => (pages ? mergeConversationPages(pages) : []),
        [pages]
    );

    const hasLoadedPages = Boolean(pages);
    const newestMessageId = messages[messages.length - 1]?.id ?? null;
    const messageCount = messages.length;

    useEffect(() => {
        if (!hasLoadedPages || !isEnabled) return;

        // `exact` matters: `queryKeys.conversations()` is the *prefix* of
        // `queryKeys.conversation(id)`, so a prefix match would invalidate the open thread as well
        // and make it refetch every page it had loaded each time its own messages changed.
        void queryClient.invalidateQueries({
            queryKey: queryKeys.conversations(),
            exact: true,
        });
    }, [hasLoadedPages, newestMessageId, messageCount, queryClient, isEnabled]);

    const loadOlder = useCallback(() => {
        if (!hasNextPage || isFetchingNextPage) return;

        void fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const refetchThread = useCallback(() => {
        void refetch();
    }, [refetch]);

    return {
        conversation: pages?.[0],
        messages,
        otherUser: pages?.[0]?.otherUser,
        hasMore: Boolean(query.hasNextPage),
        isLoadingOlder: query.isFetchingNextPage,
        loadOlder,
        refetch: refetchThread,
        isLoading: query.isPending && isEnabled,
        error: query.error,
    };
}
