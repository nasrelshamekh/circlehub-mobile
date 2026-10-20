import { router } from "expo-router";
import { Lock, Search, Send, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import Avatar from "@/components/avatar";
import { useTheme } from "@/context/themecontext";
import useSendMessage from "@/hooks/mutations/useSendMessage";
import { useMessageRecipients } from "@/hooks/useMessageRecipients";
import { MAX_PLAINTEXT_LENGTH } from "@/services/messageCrypto";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { Conversation, MessageRecipient } from "@/types/message";

export default function NewMessageModal({
    visible,
    onClose,
    conversations,
}: {
    visible: boolean;
    onClose: () => void;
    conversations: Conversation[];
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const [search, setSearch] = useState("");
    const [selectedRecipient, setSelectedRecipient] =
        useState<MessageRecipient | null>(null);
    const [messageText, setMessageText] = useState("");

    const { recipients, isLoading } = useMessageRecipients(visible);
    const sendMessage = useSendMessage();

    const filteredRecipients = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return recipients;
        return recipients.filter(
            (r) =>
                r.name?.toLowerCase().includes(q) ||
                r.username?.toLowerCase().includes(q)
        );
    }, [recipients, search]);

    function resetAndClose() {
        setSearch("");
        setSelectedRecipient(null);
        setMessageText("");
        onClose();
    }

    function handleSelectRecipient(recipient: MessageRecipient) {
        if (!recipient.canMessage) return;

        const existing = conversations.find(
            (c) =>
                c.otherUser?.username === recipient.username ||
                c.otherUser?.id === recipient.id
        );

        if (existing) {
            resetAndClose();
            router.push({
                pathname: "/messages/[id]",
                params: { id: existing.id },
            });
            return;
        }

        setSelectedRecipient(recipient);
    }

    async function handleSendFirstMessage() {
        const trimmed = messageText.trim();
        if (!selectedRecipient || !trimmed || sendMessage.isPending) return;

        try {
            const res = await sendMessage.mutateAsync({
                recipientUsername: selectedRecipient.username,
                content: trimmed,
            });
            const conversationId = res?.data?.conversationId;
            resetAndClose();
            if (conversationId) {
                router.push({
                    pathname: "/messages/[id]",
                    params: { id: conversationId },
                });
            }
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
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={resetAndClose}
        >
            <View className="flex-1 justify-center bg-black/50 px-4">
                <View className="max-h-[82%] rounded-2xl bg-surface-lowest p-4">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-title-lg font-semibold text-text-primary">
                            New Message
                        </Text>

                        <Pressable
                            onPress={resetAndClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            hitSlop={8}
                            className="h-8 w-8 items-center justify-center rounded-full bg-surface-low"
                        >
                            <X size={18} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    {!selectedRecipient ? (
                        <View className="gap-3">
                            <View className="flex-row items-center gap-2 rounded-xl border border-border bg-surface-low px-3 py-2">
                                <Search
                                    size={16}
                                    color={colors.textSecondary}
                                />
                                <TextInput
                                    value={search}
                                    onChangeText={setSearch}
                                    placeholder="Search people by name or @username…"
                                    placeholderTextColor={colors.textSecondary}
                                    className="flex-1 text-body-sm text-text-primary"
                                />
                            </View>

                            {isLoading ? (
                                <View className="items-center py-8">
                                    <ActivityIndicator color={colors.primary} />
                                </View>
                            ) : filteredRecipients.length === 0 ? (
                                <View className="items-center py-8">
                                    <Text className="text-center text-body-sm text-text-secondary">
                                        {recipients.length === 0
                                            ? "Follow people to start messaging them."
                                            : "No matching people found."}
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView className="max-h-72">
                                    <View className="gap-1.5">
                                        {filteredRecipients.map((recipient) => (
                                            <Pressable
                                                key={recipient.id}
                                                disabled={!recipient.canMessage}
                                                onPress={() =>
                                                    handleSelectRecipient(
                                                        recipient
                                                    )
                                                }
                                                className={
                                                    recipient.canMessage
                                                        ? "flex-row items-center gap-3 rounded-xl bg-surface-low p-3"
                                                        : "flex-row items-center gap-3 rounded-xl bg-surface-low p-3 opacity-50"
                                                }
                                            >
                                                <Avatar
                                                    src={recipient.avatarUrl}
                                                    name={recipient.name}
                                                    className="h-10 w-10"
                                                />

                                                <View className="min-w-0 flex-1">
                                                    <Text
                                                        numberOfLines={1}
                                                        className="text-label-md font-semibold text-text-primary"
                                                    >
                                                        {recipient.name}
                                                    </Text>
                                                    <Text
                                                        numberOfLines={1}
                                                        className="text-label-sm text-text-secondary"
                                                    >
                                                        @{recipient.username}
                                                    </Text>
                                                </View>

                                                {!recipient.canMessage && (
                                                    <View className="flex-row items-center gap-1">
                                                        <Lock
                                                            size={12}
                                                            color={
                                                                colors.textSecondary
                                                            }
                                                        />
                                                        <Text className="text-label-sm text-text-secondary">
                                                            Restricted
                                                        </Text>
                                                    </View>
                                                )}
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                        </View>
                    ) : (
                        <View className="gap-3">
                            <View className="flex-row items-center justify-between rounded-xl bg-surface-low p-3">
                                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                                    <Avatar
                                        src={selectedRecipient.avatarUrl}
                                        name={selectedRecipient.name}
                                        className="h-10 w-10"
                                    />
                                    <View className="min-w-0 flex-1">
                                        <Text
                                            numberOfLines={1}
                                            className="text-label-md font-semibold text-text-primary"
                                        >
                                            {selectedRecipient.name}
                                        </Text>
                                        <Text
                                            numberOfLines={1}
                                            className="text-label-sm text-text-secondary"
                                        >
                                            @{selectedRecipient.username}
                                        </Text>
                                    </View>
                                </View>

                                <Pressable
                                    onPress={() => setSelectedRecipient(null)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Change recipient"
                                >
                                    <Text className="text-label-sm font-semibold text-primary">
                                        Change
                                    </Text>
                                </Pressable>
                            </View>

                            <TextInput
                                value={messageText}
                                onChangeText={setMessageText}
                                maxLength={MAX_PLAINTEXT_LENGTH}
                                multiline
                                placeholder={`Write a message to ${selectedRecipient.name}…`}
                                placeholderTextColor={colors.textSecondary}
                                className="min-h-[96px] rounded-xl border border-border bg-surface-low p-3 text-body-sm text-text-primary"
                                textAlignVertical="top"
                            />

                            <View className="flex-row items-center justify-end gap-2">
                                <Pressable
                                    onPress={resetAndClose}
                                    className="rounded-xl px-4 py-2.5"
                                >
                                    <Text className="text-label-md text-text-secondary">
                                        Cancel
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleSendFirstMessage}
                                    disabled={
                                        !messageText.trim() ||
                                        sendMessage.isPending
                                    }
                                    className={
                                        messageText.trim() &&
                                        !sendMessage.isPending
                                            ? "flex-row items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5"
                                            : "flex-row items-center gap-1.5 rounded-xl bg-surface-highest px-4 py-2.5"
                                    }
                                >
                                    <Send
                                        size={15}
                                        color={
                                            messageText.trim() &&
                                            !sendMessage.isPending
                                                ? colors.buttonGradientText
                                                : colors.textSecondary
                                        }
                                    />
                                    <Text
                                        className={
                                            messageText.trim() &&
                                            !sendMessage.isPending
                                                ? "text-label-md font-semibold text-on-primary"
                                                : "text-label-md font-semibold text-text-secondary"
                                        }
                                    >
                                        {sendMessage.isPending
                                            ? "Sending…"
                                            : "Send Message"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
