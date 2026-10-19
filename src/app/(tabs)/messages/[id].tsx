import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import MessageThread from "@/components/messages/messagethread";
import { useTheme } from "@/context/themecontext";
import { useConversation } from "@/hooks/useConversation";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

export default function MessageThreadScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { isDark } = useTheme();
    const queryClient = useQueryClient();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const { messages, otherUser, isLoading, error } = useConversation(id);

    useFocusEffect(
        useCallback(() => {
            void queryClient.refetchQueries({
                queryKey: queryKeys.conversation(id),
            });
        }, [id, queryClient])
    );

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

                            <Text
                                numberOfLines={1}
                                className="text-label-sm text-text-secondary"
                            >
                                @{otherUser.username}
                            </Text>
                        </View>
                    </Pressable>
                ) : (
                    <View className="flex-1" />
                )}
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
                        recipientUsername={otherUser?.username ?? ""}
                        isLoading={isLoading}
                    />
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
