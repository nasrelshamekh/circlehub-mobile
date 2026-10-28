import { InfiniteData, QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import {
    Conversation,
    ConversationThread,
    Message,
    MessagePreview,
} from "@/types/message";

export type ConversationThreadWithMeta = ConversationThread & {
    _markedReadNewestId?: string | null;
};

export function sameId(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    return String(a).toLowerCase() === String(b).toLowerCase();
}

export function appendMessageToThreadCache(
    queryClient: QueryClient,
    conversationId: string,
    newMessage: Message,
    options?: { markReadUpTo?: boolean }
): boolean {
    if (!conversationId || !newMessage?.id) return false;

    const matchingQueries = queryClient.getQueriesData<
        Conversation[] | InfiniteData<ConversationThreadWithMeta>
    >({
        queryKey: queryKeys.conversations(),
    });

    let updatedAny = false;

    for (const [key] of matchingQueries) {
        if (
            !Array.isArray(key) ||
            key.length !== 3 ||
            !sameId(String(key[2]), conversationId)
        ) {
            continue;
        }

        queryClient.setQueryData<InfiniteData<ConversationThreadWithMeta>>(
            key,
            (current) => {
                if (
                    !current ||
                    !Array.isArray(current.pages) ||
                    current.pages.length === 0
                ) {
                    return current;
                }

                updatedAny = true;
                const firstPage = current.pages[0];
                const existingMessages = Array.isArray(firstPage.messages)
                    ? firstPage.messages
                    : [];

                const existingIndex = existingMessages.findIndex(
                    (m) =>
                        sameId(m.id, newMessage.id) ||
                        (Boolean(newMessage.clientTempId) &&
                            sameId(m.clientTempId, newMessage.clientTempId)) ||
                        (m.isMine &&
                            newMessage.isMine &&
                            m.pending &&
                            Boolean(
                                newMessage.plaintext &&
                                    m.plaintext === newMessage.plaintext
                            ))
                );

                let nextMessages: Message[];
                if (existingIndex !== -1) {
                    const existing = existingMessages[existingIndex];
                    nextMessages = [...existingMessages];
                    nextMessages[existingIndex] = {
                        ...existing,
                        ...newMessage,
                        id: newMessage.id,
                        clientTempId:
                            existing.clientTempId ?? newMessage.clientTempId,
                        pending: false,
                        failed: false,
                        plaintext: newMessage.plaintext || existing.plaintext,
                        deliveryStatus:
                            newMessage.deliveryStatus ||
                            existing.deliveryStatus ||
                            "delivered",
                    };
                } else {
                    nextMessages = [...existingMessages, newMessage];
                }

                const nextFirstPage: ConversationThreadWithMeta = {
                    ...firstPage,
                    messages: nextMessages,
                    ...(options?.markReadUpTo
                        ? { _markedReadNewestId: newMessage.id }
                        : {}),
                };

                if (
                    nextMessages === existingMessages &&
                    nextFirstPage._markedReadNewestId ===
                        firstPage._markedReadNewestId
                ) {
                    return current;
                }

                return {
                    ...current,
                    pages: [nextFirstPage, ...current.pages.slice(1)],
                };
            }
        );
    }

    return updatedAny;
}

export function patchConversationListOnMessage(
    queryClient: QueryClient,
    params: {
        conversationId: string;
        lastMessage: MessagePreview;
        lastMessageAt: string;
        unreadDelta?: number;
        resetUnread?: boolean;
    }
): boolean {
    const {
        conversationId,
        lastMessage,
        lastMessageAt,
        unreadDelta = 0,
        resetUnread = false,
    } = params;

    if (!conversationId) return false;

    const list = queryClient.getQueryData<Conversation[]>(
        queryKeys.conversations()
    );
    if (!Array.isArray(list)) return false;

    const index = list.findIndex((item) => sameId(item.id, conversationId));
    if (index === -1) return false;

    const target = list[index];
    if (
        !resetUnread &&
        unreadDelta > 0 &&
        sameId(target.lastMessage?.id, lastMessage?.id)
    ) {
        return true;
    }

    const updated: Conversation = {
        ...target,
        lastMessage: lastMessage ?? target.lastMessage,
        lastMessageAt: lastMessageAt ?? target.lastMessageAt,
        unreadCount: resetUnread
            ? 0
            : Math.max(0, (target.unreadCount || 0) + unreadDelta),
    };

    const nextList =
        index === 0
            ? [updated, ...list.slice(1)]
            : [
                  updated,
                  ...list.slice(0, index),
                  ...list.slice(index + 1),
              ];

    queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations(),
        nextList
    );
    return true;
}

export function clearConversationUnreadInCache(
    queryClient: QueryClient,
    conversationId: string
): { found: boolean; cleared: boolean } {
    if (!conversationId) return { found: false, cleared: false };

    const list = queryClient.getQueryData<Conversation[]>(
        queryKeys.conversations()
    );
    if (!Array.isArray(list)) return { found: false, cleared: false };

    const index = list.findIndex((item) => sameId(item.id, conversationId));
    if (index === -1) return { found: false, cleared: false };

    if (!list[index].unreadCount) {
        return { found: true, cleared: false };
    }

    const nextList = [...list];
    nextList[index] = { ...list[index], unreadCount: 0 };
    queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations(),
        nextList
    );
    return { found: true, cleared: true };
}

/**
 * Reconciles fresh server `conversations` list entries against any cached `conversation(id)`
 * threads in memory. If a conversation's `lastMessage.id` is not yet present in its cached
 * thread's page-1 messages (e.g., a message arrived while the app was closed/backgrounded),
 * that thread query is immediately invalidated so opening or viewing it fetches the missed
 * message even inside the 60s `staleTime` window.
 */
export function reconcileCachedThreadsWithList(
    queryClient: QueryClient,
    conversations: Conversation[]
): Conversation[] {
    if (!Array.isArray(conversations) || conversations.length === 0) {
        return conversations;
    }

    const matchingQueries = queryClient.getQueriesData<
        Conversation[] | InfiniteData<ConversationThreadWithMeta>
    >({
        queryKey: queryKeys.conversations(),
    });

    let adjusted: Conversation[] | null = null;

    for (let i = 0; i < conversations.length; i += 1) {
        const conv = conversations[i];
        if (!conv?.id) continue;

        const lastMsgId = conv.lastMessage?.id ?? null;

        for (const [key, data] of matchingQueries) {
            if (
                !Array.isArray(key) ||
                key.length !== 3 ||
                !sameId(String(key[2]), conv.id)
            ) {
                continue;
            }

            if (!data || Array.isArray(data) || !Array.isArray(data.pages)) {
                continue;
            }

            const firstPage = data.pages[0];
            if (!firstPage) continue;

            const cachedMessages = Array.isArray(firstPage.messages)
                ? firstPage.messages
                : [];

            if (
                lastMsgId &&
                !cachedMessages.some((m) => sameId(m.id, lastMsgId))
            ) {
                void queryClient.invalidateQueries({
                    queryKey: key,
                    exact: true,
                });
            } else if (
                conv.unreadCount > 0 &&
                lastMsgId &&
                sameId(firstPage._markedReadNewestId, lastMsgId)
            ) {
                if (!adjusted) {
                    adjusted = [...conversations];
                }
                adjusted[i] = { ...conv, unreadCount: 0 };
            }
        }
    }

    return adjusted ?? conversations;
}
