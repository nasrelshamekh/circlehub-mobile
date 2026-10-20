import { router, useFocusEffect } from "expo-router";
import {
    Bell,
    Check,
    CheckCheck,
    CheckCircle2,
    ChevronLeft,
    Heart,
    MessageCircle,
    ShieldCheck,
    Trash2,
    UserMinus,
    UserPlus,
    Users,
    XCircle,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import { useTheme } from "@/context/themecontext";
import {
    useDeleteNotification,
    useMarkNotificationRead,
    useMarkNotificationsSeen,
    useNotifications,
} from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
    hasNotificationTarget,
    navigateToNotificationTarget,
    notificationSentence,
} from "@/lib/notificationCopy";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { NotificationItem, NotificationType } from "@/types/notification";

function NotificationTypeBadgeIcon({
    type,
    size,
    color,
}: {
    type: NotificationType;
    size: number;
    color: string;
}) {
    switch (type) {
        case "Follow":
            return <UserPlus size={size} color={color} />;
        case "PostLike":
            return <Heart size={size} color={color} />;
        case "PostComment":
            return <MessageCircle size={size} color={color} />;
        case "CommunityJoinRequested":
            return <Users size={size} color={color} />;
        case "CommunityJoinRequestApproved":
            return <CheckCircle2 size={size} color={color} />;
        case "CommunityJoinRequestRejected":
            return <XCircle size={size} color={color} />;
        case "CommunityMemberRemoved":
            return <UserMinus size={size} color={color} />;
        case "CommunityRoleChanged":
            return <ShieldCheck size={size} color={color} />;
        case "CommunityPostRemoved":
            return <Trash2 size={size} color={color} />;
        default:
            return <Bell size={size} color={color} />;
    }
}

function NotificationRow({
    notification,
    onMarkRead,
    onDelete,
    isMutating,
}: {
    notification: NotificationItem;
    onMarkRead: (id: string) => void;
    onDelete: (id: string) => void;
    isMutating: boolean;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const sentence = notificationSentence(notification);
    const canOpen = hasNotificationTarget(notification);

    function handlePressRow() {
        if (notification.unread) {
            onMarkRead(notification.id);
        }
        if (canOpen) {
            navigateToNotificationTarget(notification);
        }
    }

    return (
        <View
            className={
                notification.unread
                    ? "flex-row items-center gap-3 rounded-2xl border border-primary/25 bg-active p-4"
                    : "flex-row items-center gap-3 rounded-2xl bg-surface-lowest p-4"
            }
        >
            <Pressable
                disabled={!canOpen && !notification.unread}
                onPress={handlePressRow}
                accessibilityRole="button"
                accessibilityLabel={`${notification.actor.name} ${sentence}`}
                className="min-w-0 flex-1 flex-row items-center gap-3"
            >
                <View className="relative">
                    <Avatar
                        src={notification.actor.avatarUrl}
                        name={notification.actor.name}
                        className="h-11 w-11"
                    />
                    <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-full border border-surface-lowest bg-primary">
                        <NotificationTypeBadgeIcon
                            type={notification.type}
                            size={11}
                            color={colors.buttonGradientText}
                        />
                    </View>
                </View>

                <View className="min-w-0 flex-1">
                    <Text className="text-body-sm text-text-primary">
                        <Text className="font-semibold">
                            {notification.actor.name}
                        </Text>{" "}
                        {sentence}
                    </Text>

                    <Text className="mt-1 text-label-sm text-text-secondary">
                        {formatRelativeTime(notification.createdAt)}
                    </Text>
                </View>
            </Pressable>

            <View className="flex-row items-center gap-1.5">
                {notification.unread && (
                    <Pressable
                        disabled={isMutating}
                        onPress={() => onMarkRead(notification.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Mark as read"
                        hitSlop={6}
                        className="h-8 w-8 items-center justify-center rounded-full bg-surface-low"
                    >
                        <Check size={15} color={colors.primary} />
                    </Pressable>
                )}

                <Pressable
                    disabled={isMutating}
                    onPress={() => onDelete(notification.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Delete notification"
                    hitSlop={6}
                    className="h-8 w-8 items-center justify-center rounded-full bg-surface-low"
                >
                    <Trash2 size={15} color={colors.textSecondary} />
                </Pressable>
            </View>
        </View>
    );
}

export default function NotificationsScreen() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const {
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        refetch,
        error,
    } = useNotifications();

    const markSeen = useMarkNotificationsSeen();
    const markRead = useMarkNotificationRead();
    const deleteRow = useDeleteNotification();
    const stampedVisitRef = useRef(false);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    async function handlePullRefresh() {
        setIsManualRefreshing(true);
        try {
            await refetch();
        } finally {
            setIsManualRefreshing(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            if (!stampedVisitRef.current && notifications.length >= 0) {
                stampedVisitRef.current = true;
                markSeen.mutate();
            }
            return () => {
                stampedVisitRef.current = false;
            };
        }, [markSeen, notifications.length])
    );

    const visitUnreadCount = notifications.filter((n) => n.unread).length;

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
                        Notifications
                    </Text>

                    {(unreadCount > 0 || visitUnreadCount > 0) && (
                        <View className="rounded-full bg-primary px-2 py-0.5">
                            <Text className="text-label-sm font-semibold text-on-primary">
                                {Math.max(unreadCount, visitUnreadCount)} unread
                            </Text>
                        </View>
                    )}
                </View>

                {visitUnreadCount > 0 && (
                    <Pressable
                        disabled={markSeen.isPending}
                        onPress={() => markSeen.mutate()}
                        accessibilityRole="button"
                        accessibilityLabel="Mark all as read"
                        hitSlop={8}
                        className="mr-2 flex-row items-center gap-1 rounded-xl bg-surface-lowest px-3 py-1.5"
                    >
                        <CheckCheck size={15} color={colors.primary} />
                        <Text className="text-label-sm font-semibold text-primary">
                            Mark all read
                        </Text>
                    </Pressable>
                )}
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
                            : "Could not load your notifications."}
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
                    {notifications.length === 0 ? (
                        <View className="items-center rounded-2xl bg-surface-lowest px-4 py-10">
                            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-active">
                                <Bell size={24} color={colors.primary} />
                            </View>

                            <Text className="text-title-lg font-semibold text-text-primary">
                                You&apos;re all caught up
                            </Text>

                            <Text className="mt-2 text-center text-body-sm text-text-secondary">
                                Likes, comments, follows, and community activity
                                will appear here.
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {notifications.map((item) => (
                                <NotificationRow
                                    key={item.id}
                                    notification={item}
                                    onMarkRead={(id) => markRead.mutate(id)}
                                    onDelete={(id) => deleteRow.mutate(id)}
                                    isMutating={
                                        markRead.isPending ||
                                        deleteRow.isPending
                                    }
                                />
                            ))}

                            {hasMore && (
                                <Pressable
                                    disabled={isLoadingMore}
                                    onPress={loadMore}
                                    className="items-center rounded-2xl bg-surface-lowest py-3.5"
                                >
                                    {isLoadingMore ? (
                                        <ActivityIndicator
                                            color={colors.primary}
                                        />
                                    ) : (
                                        <Text className="text-label-md font-semibold text-primary">
                                            Load earlier notifications
                                        </Text>
                                    )}
                                </Pressable>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
