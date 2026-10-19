import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ConversationList from "@/components/messages/conversationlist";
import { useTheme } from "@/context/themecontext";
import { useConversations } from "@/hooks/useConversations";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

export default function Messages() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const queryClient = useQueryClient();

    const { conversations, isLoading, isRefetching, refetch, error } =
        useConversations();

    useFocusEffect(
        useCallback(() => {
            void queryClient.refetchQueries({
                queryKey: queryKeys.conversations(),
            });
        }, [queryClient])
    );

    function goBack() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low" edges={["top"]}>
            <View className="flex-row items-center gap-2 px-2 py-2">
                <Pressable
                    onPress={goBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full"
                >
                    <ChevronLeft size={24} color={colors.textPrimary} />
                </Pressable>

                <Text
                    numberOfLines={1}
                    className="flex-1 text-title-lg font-semibold text-text-primary"
                >
                    Messages
                </Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : error ? (
                <View className="px-6 pt-8">
                    <Text className="text-center text-body-sm text-error">
                        {error instanceof ApiError
                            ? error.message
                            : "Could not load your messages."}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerClassName="px-4 pb-8 pt-2"
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={() => {
                                void refetch();
                            }}
                            tintColor={colors.primary}
                        />
                    }
                >
                    <ConversationList conversations={conversations} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
