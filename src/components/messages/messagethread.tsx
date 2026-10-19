import { Send } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
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
import { formatMessageDate, formatMessageTime } from "@/lib/formatPostDate";
import { ApiError } from "@/types/api";
import { Message } from "@/types/message";
import { themeColors } from "@/theme/colors";

function DateDivider({ value }: { value: string }) {
    return (
        <View className="mb-3 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />

            <Text className="text-label-sm text-text-secondary">
                {formatMessageDate(value)}
            </Text>

            <View className="h-px flex-1 bg-border" />
        </View>
    );
}

function isNewDay(current: string, previous?: string) {
    if (!previous) return true;

    const currentDate = new Date(current);
    const previousDate = new Date(previous);

    return (
        currentDate.getFullYear() !== previousDate.getFullYear() ||
        currentDate.getMonth() !== previousDate.getMonth() ||
        currentDate.getDate() !== previousDate.getDate()
    );
}

function MessageBubble({ message }: { message: Message }) {
    const isMine = message.isMine;
    const hasContent = Boolean(message.content && message.content.length > 0);

    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!isCopied) return;

        const timeout = setTimeout(() => setIsCopied(false), 1500);

        return () => clearTimeout(timeout);
    }, [isCopied]);

    async function handleCopy() {
        if (!message.content) return;

        await Clipboard.setStringAsync(message.content);
        setIsCopied(true);
    }

    return (
        <Pressable
            onPress={() => setIsExpanded((expanded) => !expanded)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            accessibilityHint="Shows when the message was sent"
            className={
                isMine
                    ? "mb-3 flex-col items-end"
                    : "mb-3 flex-col items-start"
            }
        >
            <View
                className={
                    isMine
                        ? "flex-row items-end justify-end gap-2"
                        : "flex-row items-end gap-2"
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

            {isExpanded && (
                <View
                    className={
                        isMine
                            ? "mt-1 flex-row items-center gap-3"
                            : "mt-1 flex-row items-center gap-3 pl-10"
                    }
                >
                    <Text className="text-label-sm text-text-secondary">
                        {formatMessageTime(message.createdAt)}
                    </Text>

                    {hasContent && (
                        <Pressable
                            onPress={handleCopy}
                            accessibilityRole="button"
                            accessibilityLabel="Copy message"
                            hitSlop={6}
                        >
                            <Text className="text-label-sm font-semibold text-primary">
                                {isCopied ? "Copied" : "Copy"}
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}
        </Pressable>
    );
}

export default function MessageThread({
    messages,
    recipientUsername,
    isLoading,
    isLoadingOlder,
    onLoadOlder,
}: {
    messages: Message[];
    recipientUsername: string;
    isLoading: boolean;
    isLoadingOlder?: boolean;
    onLoadOlder?: () => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const { user } = useAuth();
    const sendMessage = useSendMessage();

    const [text, setText] = useState("");

    const isSending = sendMessage.isPending;

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
                renderItem={({ item, index }) => (
                    <View>
                        {isNewDay(
                            item.createdAt,
                            orderedMessages[index + 1]?.createdAt
                        ) && <DateDivider value={item.createdAt} />}

                        <MessageBubble message={item} />
                    </View>
                )}
                contentContainerClassName="grow px-4 py-4"
                keyboardShouldPersistTaps="handled"
                onEndReached={onLoadOlder}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                    isLoadingOlder ? (
                        <View className="items-center py-3">
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : null
                }
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

            <View className="flex-row items-center gap-2 bg-surface-lowest px-4 py-3">
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
