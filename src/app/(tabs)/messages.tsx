import { router, useFocusEffect } from "expo-router";
import { ChevronLeft, SquarePen } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    BackHandler,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChatConnectionStatus from "@/components/messages/chatconnectionstatus";
import ConversationList from "@/components/messages/conversationlist";
import NewMessageModal from "@/components/messages/newmessagemodal";
import ConversationsSkeleton from "@/components/skeletons/conversationsskeleton";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { useConversations } from "@/hooks/useConversations";
import { haptics } from "@/lib/haptics";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function Messages() {
    const insets = useSafeAreaInsets();
    const topInset =
        Platform.OS === "android"
            ? Math.max(insets.top, StatusBar.currentHeight ?? 0)
            : insets.top;
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const [newMessageOpen, setNewMessageOpen] = useState(false);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    const { conversations, isLoading, refetch, error } =
        useConversations();

    async function handlePullRefresh() {
        haptics.light();
        setIsManualRefreshing(true);
        try {
            await refetch();
        } finally {
            setIsManualRefreshing(false);
        }
    }

    const goBack = useCallback(() => {
        router.replace("/(tabs)");
    }, []);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                goBack();
                return true;
            };
            const sub = BackHandler.addEventListener(
                "hardwareBackPress",
                onBackPress
            );
            return () => sub.remove();
        }, [goBack])
    );

    return (
        <View
            className="flex-1 bg-surface-low"
            style={{ paddingTop: topInset }}
        >
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

                <GradientButton
                    onPress={() => setNewMessageOpen(true)}
                    accessibilityLabel="New message"
                    icon={<SquarePen size={16} color={colors.buttonGradientText} />}
                    label="New"
                    className="mr-2 rounded-full"
                    contentStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
                    textClassName="text-label-sm font-semibold"
                />
            </View>

            {isLoading ? (
                <ConversationsSkeleton />
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
        </View>
    );
}
