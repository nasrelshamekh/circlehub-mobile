import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { MessageCircleMore } from "lucide-react-native";
import { memo, useEffect } from "react";
import { InteractionManager, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import PresenceDot from "@/components/messages/presencedot";
import PresenceLabel from "@/components/messages/presencelabel";
import { useTheme } from "@/context/themecontext";
import {
    conversationQueryOptions,
    STALE_TIME_MS,
} from "@/hooks/useConversation";
import { useDecryptedContent } from "@/hooks/useDecryptedContent";
import { formatShortTime } from "@/lib/formatPostDate";
import { queryKeys } from "@/lib/queryKeys";
import { themeColors } from "@/theme/colors";
import { Conversation } from "@/types/message";

const IDLE_PREWARM_COUNT = 2;
const IDLE_PREWARM_DELAY_MS = 1000;

const ConversationRow = memo(function ConversationRow({
    conversation,
}: {
    conversation: Conversation;
}) {
    const queryClient = useQueryClient();
    const unread = conversation.unreadCount > 0;
    const last = conversation.lastMessage;
    const { text: decryptedBody } = useDecryptedContent(last?.content);

    let preview = "No messages yet";
    if (last) {
        const body = last.hasPost
            ? decryptedBody || "Shared a post"
            : decryptedBody || "";
        preview = last.isMine ? `You: ${body}` : body;
    }

    function prewarmConversation() {
        const state = queryClient.getQueryState(
            queryKeys.conversation(conversation.id)
        );
        if (
            state?.dataUpdatedAt &&
            Date.now() - state.dataUpdatedAt < STALE_TIME_MS
        ) {
            return;
        }
        void queryClient.prefetchInfiniteQuery(
            conversationQueryOptions(conversation.id, { markRead: false })
        );
    }

    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/messages/[id]",
                    params: {
                        id: conversation.id,
                        name: conversation.otherUser.name,
                        username: conversation.otherUser.username,
                        avatarUrl: conversation.otherUser.avatarUrl || undefined,
                        isOnline: String(conversation.otherUser.isOnline),
                        lastSeenAt: conversation.otherUser.lastSeenAt || undefined,
                    },
                })
            }
            onPressIn={prewarmConversation}
            accessibilityRole="button"
            accessibilityLabel={`Open conversation with ${conversation.otherUser.name}`}
            className="flex-row items-center gap-3 rounded-2xl bg-surface-lowest p-4"
        >
            <View className="relative">
                <Avatar
                    src={conversation.otherUser.avatarUrl}
                    name={conversation.otherUser.name}
                    className="h-12 w-12"
                />
                <PresenceDot isOnline={conversation.otherUser.isOnline} />
            </View>

            <View className="min-w-0 flex-1">
                <View className="flex-row items-center justify-between gap-2">
                    <Text
                        numberOfLines={1}
                        className="flex-1 text-label-md font-semibold text-text-primary"
                    >
                        {conversation.otherUser.name}
                    </Text>

                    <Text className="text-label-sm text-text-secondary">
                        {formatShortTime(conversation.lastMessageAt)}
                    </Text>
                </View>

                <PresenceLabel
                    isOnline={conversation.otherUser.isOnline}
                    lastSeenAt={conversation.otherUser.lastSeenAt}
                />

                <View className="mt-0.5 flex-row items-center justify-between gap-2">
                    <Text
                        numberOfLines={1}
                        className={
                            unread
                                ? "flex-1 text-body-sm font-semibold text-text-primary"
                                : "flex-1 text-body-sm text-text-secondary"
                        }
                    >
                        {preview}
                    </Text>

                    {unread && (
                        <View className="min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5">
                            <Text className="text-label-sm font-semibold text-on-primary">
                                {conversation.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Pressable>
    );
});

export default function ConversationList({
    conversations,
}: {
    conversations: Conversation[];
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!conversations.length) return undefined;

        const candidates = conversations
            .slice(0, IDLE_PREWARM_COUNT)
            .filter((conv) => {
                if (!conv?.id) return false;
                const state = queryClient.getQueryState(
                    queryKeys.conversation(conv.id)
                );
                return !state?.dataUpdatedAt;
            });

        if (candidates.length === 0) return undefined;

        let cancelled = false;
        let delayTimer: ReturnType<typeof setTimeout> | null = null;

        const interactionHandle = InteractionManager.runAfterInteractions(() => {
            if (cancelled) return;
            delayTimer = setTimeout(async () => {
                for (const conv of candidates) {
                    if (cancelled) break;
                    try {
                        await queryClient.prefetchInfiniteQuery(
                            conversationQueryOptions(conv.id, { markRead: false })
                        );
                    } catch {
                        // Best-effort idle pre-warm
                    }
                }
            }, IDLE_PREWARM_DELAY_MS);
        });

        return () => {
            cancelled = true;
            interactionHandle.cancel();
            if (delayTimer) clearTimeout(delayTimer);
        };
    }, [conversations, queryClient]);

    if (conversations.length === 0) {
        return (
            <View className="items-center rounded-2xl bg-surface-lowest px-4 py-10">
                <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-active">
                    <MessageCircleMore size={24} color={colors.primary} />
                </View>

                <Text className="text-title-lg font-semibold text-text-primary">
                    No messages yet
                </Text>

                <Text className="mt-2 text-center text-body-sm text-text-secondary">
                    Start a new message or share a post with a friend to start
                    the conversation.
                </Text>
            </View>
        );
    }

    return (
        <View className="gap-3">
            {conversations.map((conversation) => (
                <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                />
            ))}
        </View>
    );
}
