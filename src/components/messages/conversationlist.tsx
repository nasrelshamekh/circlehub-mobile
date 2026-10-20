import { router } from "expo-router";
import { MessageCircleMore } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import PresenceDot from "@/components/messages/presencedot";
import PresenceLabel from "@/components/messages/presencelabel";
import { useTheme } from "@/context/themecontext";
import { useDecryptedContent } from "@/hooks/useDecryptedContent";
import { formatShortTime } from "@/lib/formatPostDate";
import { themeColors } from "@/theme/colors";
import { Conversation } from "@/types/message";

function ConversationRow({
    conversation,
}: {
    conversation: Conversation;
}) {
    const unread = conversation.unreadCount > 0;
    const last = conversation.lastMessage;
    const decryptedBody = useDecryptedContent(last?.content);

    let preview = "No messages yet";
    if (last) {
        const body = last.hasPost
            ? decryptedBody || "Shared a post"
            : decryptedBody || "";
        preview = last.isMine ? `You: ${body}` : body;
    }

    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/messages/[id]",
                    params: { id: conversation.id },
                })
            }
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
}

export default function ConversationList({
    conversations,
}: {
    conversations: Conversation[];
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

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
