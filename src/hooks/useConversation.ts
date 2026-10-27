import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { getConversation, markConversationRead } from "@/api/messages";
import {
    clearConversationUnreadInCache,
    ConversationThreadWithMeta,
    sameId,
} from "@/lib/messageCacheHelpers";
import { mergeConversationPages } from "@/lib/messagePages";
import { queryKeys } from "@/lib/queryKeys";
import { decryptMessageContent, peekDecrypted } from "@/services/messageCrypto";
import { Conversation, Message } from "@/types/message";

export const PAGE_SIZE = 25;
export const STALE_TIME_MS = 1000 * 60;
const VISIBLE_FIRST_COUNT = 12;
const VISIBLE_SLICE_SIZE = 4;
const BACKGROUND_SLICE_SIZE = 2;
const BACKGROUND_YIELD_MS = 12;

function scheduleBackgroundStep(fn: () => void): void {
    const timer = setTimeout(fn, BACKGROUND_YIELD_MS);
    if (typeof (timer as unknown as { unref?: () => void })?.unref === "function") {
        (timer as unknown as { unref: () => void }).unref();
    }
}

function warmOlderMessagesInBackground(messages: Message[]): void {
    let cursor = messages.length - 1;

    const step = () => {
        if (cursor < 0) return;
        const batch: Message[] = [];
        while (cursor >= 0 && batch.length < BACKGROUND_SLICE_SIZE) {
            const msg = messages[cursor];
            cursor -= 1;
            if (msg?.content && peekDecrypted(msg.content) === null) {
                batch.push(msg);
            }
        }

        if (batch.length === 0) {
            if (cursor >= 0) {
                scheduleBackgroundStep(step);
            }
            return;
        }

        void Promise.allSettled(
            batch.map((m) =>
                m.content
                    ? decryptMessageContent(m.content)
                    : Promise.resolve("")
            )
        ).finally(() => {
            if (cursor >= 0) {
                scheduleBackgroundStep(step);
            }
        });
    };

    scheduleBackgroundStep(step);
}

export async function fetchConversationThread(
    id: string,
    pageParam = 1,
    pageSize = PAGE_SIZE,
    markRead = true
): Promise<ConversationThreadWithMeta> {
    const { data } = markRead
        ? await getConversation(id, pageParam, pageSize)
        : await getConversation(id, pageParam, pageSize, false);

    if (data?.messages && data.messages.length > 0) {
        // 1. Synchronously attach any plaintexts already cached in settledCache.
        for (const m of data.messages) {
            if (!m.plaintext && m.content) {
                const cached = peekDecrypted(m.content);
                if (cached !== null) {
                    m.plaintext = cached;
                }
            }
        }

        // 2. Phase 1 (Critical Path): Decrypt only the viewport-visible newest messages
        // before resolving the query so Frame 0 paints completely with zero skeletons.
        const visibleStartIndex = Math.max(
            0,
            data.messages.length - VISIBLE_FIRST_COUNT
        );
        const visibleUncached = data.messages
            .slice(visibleStartIndex)
            .filter((m) => !m.plaintext && Boolean(m.content));

        for (let i = 0; i < visibleUncached.length; i += VISIBLE_SLICE_SIZE) {
            const slice = visibleUncached.slice(i, i + VISIBLE_SLICE_SIZE);
            await Promise.allSettled(
                slice.map(async (m) => {
                    if (!m.content) return;
                    const cached = peekDecrypted(m.content);
                    if (cached !== null) {
                        m.plaintext = cached;
                        return;
                    }
                    try {
                        const text = await decryptMessageContent(m.content);
                        if (text) {
                            m.plaintext = text;
                        }
                    } catch {
                        // ignore
                    }
                })
            );
        }

        // 3. Phase 2 (Background): Cooperatively decrypt any older offscreen messages
        // across idle frame ticks so scrolling up hits a warm settledCache without
        // blocking Hermes navigation transitions.
        if (visibleStartIndex > 0) {
            const olderUncached = data.messages
                .slice(0, visibleStartIndex)
                .filter((m) => !m.plaintext && Boolean(m.content));
            if (olderUncached.length > 0) {
                warmOlderMessagesInBackground(olderUncached);
            }
        }
    }

    const threadWithMeta: ConversationThreadWithMeta = data;
    if (data) {
        threadWithMeta._markedReadNewestId =
            markRead && pageParam === 1 && data.messages?.length > 0
                ? data.messages[data.messages.length - 1].id
                : null;
    }

    return threadWithMeta;
}

/**
 * The options every read of one conversation goes through — the hook that opens the thread and the
 * prewarm the conversation list starts when a row is touched.
 *
 * They have to agree on everything, because React Query keeps ONE query per key and
 * `prefetchInfiniteQuery` *replaces* that query's options with the ones it is handed.
 */
export function conversationQueryOptions(
    id: string,
    queryBehavior?: { markRead?: boolean }
) {
    const shouldMarkRead = queryBehavior?.markRead ?? true;
    return {
        queryKey: queryKeys.conversation(id),
        queryFn: ({ pageParam }: { pageParam?: number }) => {
            const page = pageParam ?? 1;
            return fetchConversationThread(
                id,
                page,
                PAGE_SIZE,
                page === 1 ? shouldMarkRead : false
            );
        },
        initialPageParam: 1,
        getNextPageParam: (
            lastPage: ConversationThreadWithMeta,
            pages: ConversationThreadWithMeta[]
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
    const lastMarkedServerReadRef = useRef<{
        conversationId: string | null;
        messageId: string | null;
    }>({
        conversationId: null,
        messageId: null,
    });

    const options = useMemo(
        () => ({
            ...conversationQueryOptions(id, { markRead: true }),
            enabled: isEnabled,
        }),
        [id, isEnabled]
    );

    const query = useInfiniteQuery(options);

    const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

    const pages = query.data?.pages;

    const messages = useMemo(
        () => (pages ? mergeConversationPages(pages) : []),
        [pages]
    );

    const hasLoadedPages = Boolean(pages);
    const newestMessage = messages[messages.length - 1];
    const newestMessageId = newestMessage?.id ?? null;
    const newestIsMine = Boolean(newestMessage?.isMine);
    const markedReadOnFetch = pages?.[0]?._markedReadNewestId ?? null;
    const messageCount = messages.length;

    useEffect(() => {
        if (!hasLoadedPages || !isEnabled || !id) return;

        const { found } = clearConversationUnreadInCache(queryClient, id);
        if (!found) {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations(),
                exact: true,
            });
        }

        if (!newestMessageId) return;

        const alreadyMarkedOnFetch = sameId(markedReadOnFetch, newestMessageId);
        const alreadySentReceipt =
            sameId(lastMarkedServerReadRef.current.conversationId, id) &&
            sameId(lastMarkedServerReadRef.current.messageId, newestMessageId);

        if (!newestIsMine && !alreadyMarkedOnFetch && !alreadySentReceipt) {
            lastMarkedServerReadRef.current = {
                conversationId: id,
                messageId: newestMessageId,
            };
            Promise.resolve(markConversationRead(id)).catch(() => undefined);
        }
    }, [
        hasLoadedPages,
        id,
        isEnabled,
        markedReadOnFetch,
        messageCount,
        newestIsMine,
        newestMessageId,
        queryClient,
    ]);

    const loadOlder = useCallback(() => {
        if (!hasNextPage || isFetchingNextPage) return;

        void fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const refetchThread = useCallback(() => {
        void refetch();
    }, [refetch]);

    const conversationsCache = queryClient.getQueryData<Conversation[]>(
        queryKeys.conversations()
    );
    const cachedConv = conversationsCache?.find(
        (c) => String(c.id).toLowerCase() === String(id).toLowerCase()
    );

    return {
        conversation: pages?.[0],
        messages,
        otherUser: pages?.[0]?.otherUser ?? cachedConv?.otherUser,
        hasMore: Boolean(query.hasNextPage),
        isLoadingOlder: query.isFetchingNextPage,
        loadOlder,
        refetch: refetchThread,
        isLoading:
            (query.isPending || (query.isFetching && messages.length === 0)) &&
            isEnabled,
        isFetching: query.isFetching,
        error: query.error,
    };
}
