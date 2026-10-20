import { router } from "expo-router";
import { ChevronLeft, SquarePen } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ChatConnectionStatus from "@/components/messages/chatconnectionstatus";
import ConversationList from "@/components/messages/conversationlist";
import NewMessageModal from "@/components/messages/newmessagemodal";
import { useTheme } from "@/context/themecontext";
import { useConversations } from "@/hooks/useConversations";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function Messages() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const [newMessageOpen, setNewMessageOpen] = useState(false);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    const { conversations, isLoading, refetch, error } =
        useConversations();

    async function handlePullRefresh() {
        setIsManualRefreshing(true);
        try {
            await refetch();
        } finally {
            setIsManualRefreshing(false);
        }
    }

    function goBack() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low" edges={["top"]}>
            <View className="flex-row items-center justify-between gap-2 px-2 py-2">
                <View className="flex-1 flex-row items-center gap-2">
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
                        className="text-title-lg font-semibold text-text-primary"
                    >
                        Messages
                    </Text>

                    <ChatConnectionStatus />
                </View>

                <Pressable
                    onPress={() => setNewMessageOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="New message"
                    hitSlop={8}
                    className="mr-2 flex-row items-center gap-1.5 rounded-xl bg-primary px-3 py-2"
                >
                    <SquarePen size={16} color={colors.buttonGradientText} />
                    <Text className="text-label-sm font-semibold text-on-primary">
                        New
                    </Text>
                </Pressable>
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
                            refreshing={isManualRefreshing}
                            onRefresh={() => {
                                void handlePullRefresh();
                            }}
                            tintColor={colors.primary}
                        />
                    }
                >
                    <ConversationList conversations={conversations} />
                </ScrollView>
            )}

            <NewMessageModal
                visible={newMessageOpen}
                onClose={() => setNewMessageOpen(false)}
                conversations={conversations}
            />
        </SafeAreaView>
    );
}
