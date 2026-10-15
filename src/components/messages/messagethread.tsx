import { Send } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import Avatar from "@/components/avatar";
import SharedPostCard from "@/components/messages/sharedpostcard";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useSendMessage from "@/hooks/mutations/useSendMessage";
import { ApiError } from "@/types/api";
import { Message } from "@/types/message";
import { themeColors } from "@/theme/colors";

function MessageBubble({ message }: { message: Message }) {
    const isMine = message.isMine;
    const hasContent = Boolean(message.content && message.content.length > 0);

    return (
        <View
            className={
                isMine
                    ? "mb-3 flex-row items-end justify-end gap-2"
                    : "mb-3 flex-row items-end gap-2"
            }
        >
            {!isMine && (
                <Avatar
                    src={message.sender.avatarUrl}
                    name={message.sender.name}
                    className="h-8 w-8"
                    textClassName="text-label-sm"
                />
            )}

            <View className={isMine ? "max-w-[78%] items-end" : "max-w-[78%]"}>
                {hasContent && (
                    <View
                        className={
                            isMine
                                ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5"
                                : "rounded-2xl rounded-bl-md bg-surface-lowest px-4 py-2.5"
                        }
                    >
                        <Text
                            className={
                                isMine
                                    ? "text-body-sm text-on-primary"
                                    : "text-body-sm text-text-primary"
                            }
                        >
                            {message.content}
                        </Text>
                    </View>
                )}

                {message.postId && <SharedPostCard post={message.post} />}
            </View>
        </View>
    );
}

export default function MessageThread({
    messages,
    recipientUsername,
    isLoading,
}: {
    messages: Message[];
    recipientUsername: string;
    isLoading: boolean;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const { user } = useAuth();
    const sendMessage = useSendMessage();

    const [text, setText] = useState("");

    const isSending = sendMessage.isPending;

    // Render the thread inverted so the newest message is anchored to the bottom
    // of the list. The keyboard then only shrinks the list: the end stays where it
    // is, so the newest message stays visible without any scroll command.
    // Programmatic re-anchoring cannot be used here — a scroll dispatched from
    // onLayout/onContentSizeChange lands before the native resize is applied, so
    // it is clamped short and leaves the last message behind the composer.
    const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

    async function handleSend() {
        if (isSending) return;

        const trimmed = text.trim();

        if (!trimmed) return;

        try {
            await sendMessage.mutateAsync({
                recipientUsername,
                content: trimmed,
            });
            setText("");
        } catch (error) {
            Alert.alert(
                "Message not sent",
                error instanceof ApiError
                    ? error.message
                    : "Something went wrong. Please try again."
            );
        }
    }

    return (
        <View className="flex-1">
            <FlatList
                inverted
                data={orderedMessages}
                keyExtractor={(message) => message.id}
                renderItem={({ item }) => <MessageBubble message={item} />}
                contentContainerClassName="grow px-4 py-4"
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                    isLoading ? null : (
                        <View className="items-center justify-center py-10">
                            <Text className="text-center text-body-sm text-text-secondary">
                                No messages yet. Say hello to{" "}
                                {recipientUsername ? `@${recipientUsername}` : "them"}!
                            </Text>
                        </View>
                    )
                }
            />

            <View className="flex-row items-end gap-2 bg-surface-lowest px-4 py-3">
                <Avatar
                    src={user?.avatarUrl}
                    name={user?.name ?? ""}
                    className="h-9 w-9"
                    textClassName="text-label-sm"
                />

                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Write a message…"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    className="max-h-32 flex-1 rounded-2xl border border-border bg-surface-low px-4 py-2.5 text-body-sm text-text-primary"
                />

                <Pressable
                    onPress={handleSend}
                    disabled={isSending || text.trim().length === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    hitSlop={6}
                    className={
                        text.trim() && !isSending
                            ? "h-10 w-10 items-center justify-center rounded-full bg-primary"
                            : "h-10 w-10 items-center justify-center rounded-full bg-surface-highest"
                    }
                >
                    <Send
                        size={18}
                        color={
                            text.trim() && !isSending
                                ? colors.buttonGradientText
                                : colors.textSecondary
                        }
                    />
                </Pressable>
            </View>
        </View>
    );
}
