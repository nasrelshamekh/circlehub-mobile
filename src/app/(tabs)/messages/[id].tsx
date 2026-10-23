import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    BackHandler,
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
import MessageThreadSkeleton from "@/components/skeletons/messagethreadskeleton";
import { useTheme } from "@/context/themecontext";
import { useConversation } from "@/hooks/useConversation";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function MessageThreadScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(true);

    useFocusEffect(
        useCallback(() => {
            setIsFocused(true);
            return () => {
                setIsFocused(false);
            };
        }, [])
    );

    const colors = isDark ? themeColors.dark : themeColors.light;

    const {
        messages,
        otherUser,
        isLoading,
        isLoadingOlder,
        loadOlder,
        refetch,
        error,
    } = useConversation(id, { enabled: isFocused });

    function goBack() {
        router.replace("/messages");
    }

    useEffect(() => {
        if (!isFocused) return;
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            goBack();
            return true;
        });
        return () => sub.remove();
    }, [isFocused]);

    return (
        <SafeAreaView className="flex-1 bg-surface-lowest" edges={["top"]}>
            <View className="flex-row items-center gap-1 px-2 py-2">
                <Pressable
                    onPress={goBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={18}
                    pressRetentionOffset={18}
                    className="h-12 w-12 items-center justify-center rounded-full"
                >
                    <ChevronLeft size={24} color={colors.textPrimary} />
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
                <MessageThreadSkeleton />
            ) : error ? (
                <View className="flex-1 items-center justify-center bg-surface-low px-6">
                    <Text className="text-center text-body-sm text-error">
                        {error instanceof ApiError
                            ? error.message
                            : "Could not load this conversation."}
                    </Text>

                    <Pressable
                        onPress={refetch}
                        accessibilityRole="button"
                        accessibilityLabel="Try loading this conversation again"
                        className="mt-4 rounded-full bg-primary px-5 py-2.5"
                    >
                        <Text className="text-label-md font-semibold text-on-primary">
                            Try again
                        </Text>
                    </Pressable>
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
