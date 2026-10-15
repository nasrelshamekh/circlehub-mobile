import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";

import Header from "@/components/header";
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

    // Tab screens stay mounted, so React Query never remounts this one: without
    // this the list keeps whatever it fetched first, leaving stale unread badges
    // after a thread is read and missing messages sent since. Refresh whenever
    // the inbox comes back into view.
    useFocusEffect(
        useCallback(() => {
            void queryClient.refetchQueries({
                queryKey: queryKeys.conversations(),
            });
        }, [queryClient])
    );

    return (
        <View className="flex-1 bg-surface-low">
            <Header />

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
        </View>
    );
}
