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
import { useChatConnection } from "@/context/chatconnectioncontext";
import { useTheme } from "@/context/themecontext";
import { useConversation } from "@/hooks/useConversation";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function MessageThreadScreen() {
    const params = useLocalSearchParams<{
        id: string;
        name?: string;
        username?: string;
        avatarUrl?: string;
        isOnline?: string;
        lastSeenAt?: string;
    }>();
    const id = params.id;
    const { isDark } = useTheme();
    const { setActiveConversationId } = useChatConnection();
    const [isFocused, setIsFocused] = useState(true);

    useFocusEffect(
        useCallback(() => {
            setIsFocused(true);
            if (id) {
                setActiveConversationId(id);
            }
            return () => {
                setIsFocused(false);
                setActiveConversationId(null);
            };
        }, [id, setActiveConversationId])
    );

    useEffect(() => {
        return () => {
            setActiveConversationId(null);
        };
    }, [setActiveConversationId]);

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

    const resolvedOtherUser =
        otherUser ??
        (params.name
            ? {
                  id: "",
                  name: params.name,
                  username: params.username ?? "",
                  avatarUrl: params.avatarUrl || null,
                  isOnline: params.isOnline === "true",
                  lastSeenAt: params.lastSeenAt || null,
              }
            : undefined);

    const isOtherTyping = useTypingIndicator(resolvedOtherUser?.id);

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

                {resolvedOtherUser ? (
                    <Pressable
                        onPress={() => {
                            if (resolvedOtherUser.username) {
                                router.push({
                                    pathname: "/profile/[username]",
                                    params: {
                                        username: resolvedOtherUser.username,
                                    },
                                });
                            }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${resolvedOtherUser.name}'s profile`}
                        className="min-w-0 flex-1 flex-row items-center gap-3"
                    >
                        <Avatar
                            src={resolvedOtherUser.avatarUrl}
                            name={resolvedOtherUser.name}
                            className="h-9 w-9"
                            textClassName="text-label-sm"
                        />

                        <View className="min-w-0 flex-1">
                            <Text
                                numberOfLines={1}
                                className="text-label-md font-semibold text-text-primary"
                            >
                                {resolvedOtherUser.name}
                            </Text>

                            <PresenceLabel
                                isOnline={resolvedOtherUser.isOnline}
                                lastSeenAt={resolvedOtherUser.lastSeenAt}
                                isTyping={isOtherTyping}
                            />
                        </View>
                    </Pressable>
                ) : (
                    <View className="min-w-0 flex-1 flex-row items-center gap-3">
                        <View className="h-9 w-9 rounded-full bg-surface-medium" />
                        <View className="min-w-0 flex-1 gap-1">
                            <View className="h-4 w-28 rounded bg-surface-medium" />
                            <View className="h-3 w-16 rounded bg-surface-medium" />
                        </View>
                    </View>
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
                        recipientId={resolvedOtherUser?.id}
                        recipientUsername={resolvedOtherUser?.username ?? ""}
                        recipientName={resolvedOtherUser?.name}
                        recipientAvatarUrl={resolvedOtherUser?.avatarUrl}
                        isLoading={isLoading}
                        isLoadingOlder={isLoadingOlder}
                        onLoadOlder={loadOlder}
                    />
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
