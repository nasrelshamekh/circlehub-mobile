import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import ChatConnectionStatus from "@/components/messages/chatconnectionstatus";
import MessageThread from "@/components/messages/messagethread";
import PresenceLabel from "@/components/messages/presencelabel";
import { useTheme } from "@/context/themecontext";
import { useConversation } from "@/hooks/useConversation";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function MessageThreadScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { isDark } = useTheme();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const { messages, otherUser, isLoading, isLoadingOlder, loadOlder, error } =
        useConversation(id);

    function goBack() {
        router.replace("/messages");
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-lowest" edges={["top"]}>
            <View className="flex-row items-center gap-1 px-2 py-2">
                <Pressable
                    onPress={goBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={8}
                    className="h-9 w-9 items-center justify-center"
                >
                    <ChevronLeft size={22} color={colors.textPrimary} />
                </Pressable>

                {otherUser ? (
                    <Pressable
                        onPress={() =>
                            router.push({
                                pathname: "/profile/[username]",
                                params: { username: otherUser.username },
                            })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`View ${otherUser.name}'s profile`}
                        className="min-w-0 flex-1 flex-row items-center gap-3"
                    >
                        <Avatar
                            src={otherUser.avatarUrl}
                            name={otherUser.name}
                            className="h-9 w-9"
                            textClassName="text-label-sm"
                        />

                        <View className="min-w-0 flex-1">
                            <Text
                                numberOfLines={1}
                                className="text-label-md font-semibold text-text-primary"
                            >
                                {otherUser.name}
                            </Text>

                            <PresenceLabel
                                isOnline={otherUser.isOnline}
                                lastSeenAt={otherUser.lastSeenAt}
                            />
                        </View>
                    </Pressable>
                ) : (
                    <View className="flex-1" />
                )}

                <ChatConnectionStatus />
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center bg-surface-low">
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : error ? (
                <View className="flex-1 items-center bg-surface-low px-6 pt-8">
                    <Text className="text-center text-body-sm text-error">
                        {error instanceof ApiError
                            ? error.message
                            : "Could not load this conversation."}
                    </Text>
                </View>
            ) : (
                <KeyboardAvoidingView
                    className="flex-1 bg-surface-low"
                    behavior="padding"
                >
                    <MessageThread
                        messages={messages}
                        recipientId={otherUser?.id}
                        recipientUsername={otherUser?.username ?? ""}
                        recipientName={otherUser?.name}
                        recipientAvatarUrl={otherUser?.avatarUrl}
                        isLoading={isLoading}
                        isLoadingOlder={isLoadingOlder}
                        onLoadOlder={loadOlder}
                    />
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
