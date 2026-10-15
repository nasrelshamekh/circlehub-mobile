import { router } from "expo-router";
import { Send, X } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import { useTheme } from "@/context/themecontext";
import useSendMessage from "@/hooks/mutations/useSendMessage";
import { useMessageRecipients } from "@/hooks/useMessageRecipients";
import { ApiError } from "@/types/api";
import { MessageRecipient } from "@/types/message";
import { Post } from "@/types/post";
import { themeColors } from "@/theme/colors";

export default function SharePostModal({
    post,
    onClose,
}: {
    post: Post;
    onClose: () => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const { recipients, isLoading } = useMessageRecipients(true);
    const sendMessage = useSendMessage();

    const [sendingTo, setSendingTo] = useState<string | null>(null);

    async function handleSend(recipient: MessageRecipient) {
        if (!recipient.canMessage || sendMessage.isPending) return;

        setSendingTo(recipient.username);

        try {
            const response = await sendMessage.mutateAsync({
                recipientUsername: recipient.username,
                postId: post.id,
            });

            onClose();

            router.push({
                pathname: "/messages/[id]",
                params: { id: response.data.conversationId },
            });
        } catch (error) {
            Alert.alert(
                "Could not send post",
                error instanceof ApiError
                    ? error.message
                    : "Something went wrong. Please try again."
            );
        } finally {
            setSendingTo(null);
        }
    }

    return (
        <Modal
            visible
            animationType="slide"
            onRequestClose={onClose}
            onDismiss={onClose}
        >
            <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
                <View className="flex-row items-center justify-between px-4 py-3">
                    <Text className="text-title-lg font-semibold text-text-primary">
                        Send post
                    </Text>

                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        hitSlop={8}
                        className="h-9 w-9 items-center justify-center rounded-full bg-surface-lowest"
                    >
                        <X size={18} color={colors.textPrimary} />
                    </Pressable>
                </View>

                {isLoading ? (
                    <View className="items-center justify-center py-16">
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : recipients.length === 0 ? (
                    <View className="items-center px-6 py-16">
                        <Text className="text-center text-body-sm text-text-secondary">
                            Follow people to send them posts.
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerClassName="gap-3 px-4 pb-10"
                        keyboardShouldPersistTaps="handled"
                    >
                        {recipients.map((recipient) => {
                            const isBusy =
                                sendMessage.isPending &&
                                sendingTo === recipient.username;

                            return (
                                <Pressable
                                    key={recipient.id}
                                    onPress={() => handleSend(recipient)}
                                    disabled={
                                        !recipient.canMessage || sendMessage.isPending
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel={`Send post to ${recipient.name}`}
                                    accessibilityState={{
                                        disabled: !recipient.canMessage,
                                    }}
                                    className={
                                        recipient.canMessage
                                            ? "flex-row items-center gap-3 rounded-2xl bg-surface-lowest p-4"
                                            : "flex-row items-center gap-3 rounded-2xl bg-surface-lowest p-4 opacity-50"
                                    }
                                >
                                    <Avatar
                                        src={recipient.avatarUrl}
                                        name={recipient.name}
                                        className="h-12 w-12"
                                    />

                                    <View className="flex-1">
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
                                            {recipient.canMessage
                                                ? `@${recipient.username}`
                                                : "Not accepting messages"}
                                        </Text>
                                    </View>

                                    {isBusy ? (
                                        <ActivityIndicator color={colors.primary} />
                                    ) : (
                                        recipient.canMessage && (
                                            <Send
                                                size={18}
                                                color={colors.primary}
                                            />
                                        )
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
}
