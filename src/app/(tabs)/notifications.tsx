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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Skeleton from "@/components/ui/skeleton";
import { useAuth } from "@/context/authcontext";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/context/themecontext";
import {
    useDeleteNotification,
    useMarkAllNotificationsRead,
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
                    ? "flex-row items-center gap-3 rounded-xl border border-primary/20 bg-active p-3.5"
                    : "flex-row items-center gap-3 rounded-xl bg-surface-low p-3.5"
            }
        >
            <Pressable
                disabled={!canOpen && !notification.unread}
                onPress={handlePressRow}
                accessibilityRole="button"
                accessibilityLabel={`${notification.actor?.name ?? "Someone"} ${sentence}`}
                className="min-w-0 flex-1 flex-row items-center gap-3"
            >
                <View className="relative">
                    <Avatar
                        src={notification.actor?.avatarUrl}
                        name={notification.actor?.name ?? ""}
                        className="h-10 w-10"
                    />
                    <View className="absolute -bottom-0.5 -right-0.5 h-4.5 w-4.5 items-center justify-center rounded-full border border-surface-lowest bg-primary">
                        <NotificationTypeBadgeIcon
                            type={notification.type}
                            size={10}
                            color={colors.buttonGradientText}
                        />
                    </View>
                </View>

                <View className="min-w-0 flex-1">
                    <View className="flex-row flex-wrap items-center gap-1.5">
                        <Text className="text-body-sm text-text-primary">
                            <Text className="font-semibold">
                                {notification.actor?.name ?? "Someone"}
                            </Text>{" "}
                            {sentence}
                        </Text>
                        {notification.unread && (
                            <View className="h-2 w-2 rounded-full bg-primary" />
                        )}
                    </View>

                    <Text className="mt-1 text-label-xs text-text-secondary">
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
                        className="h-8 w-8 items-center justify-center rounded-full bg-surface-lowest active:opacity-70"
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
                    className="h-8 w-8 items-center justify-center rounded-full bg-surface-lowest active:opacity-70"
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
    const { user } = useAuth();

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
    const markAllRead = useMarkAllNotificationsRead();
    const markRead = useMarkNotificationRead();
    const deleteRow = useDeleteNotification();
    const isFocusedRef = useRef(false);
    const stampedVisitRef = useRef(false);
    const unreadCountRef = useRef(unreadCount);
    const isLoadingRef = useRef(isLoading);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    useEffect(() => {
        unreadCountRef.current = unreadCount;
    }, [unreadCount]);

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

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
            isFocusedRef.current = true;

            // Stamp at most once when the screen gains focus, provided data is ready
            if (
                !stampedVisitRef.current &&
                !isLoadingRef.current &&
                unreadCountRef.current > 0
            ) {
                stampedVisitRef.current = true;
                markSeen.mutate();
            }

            return () => {
                isFocusedRef.current = false;
                stampedVisitRef.current = false;
            };
        }, [markSeen])
    );

    // If data finished loading while still focused on this visit, stamp once
    useEffect(() => {
        if (
            isFocusedRef.current &&
            !stampedVisitRef.current &&
            !isLoading &&
            unreadCount > 0
        ) {
            stampedVisitRef.current = true;
            markSeen.mutate();
        }
    }, [isLoading, unreadCount, markSeen]);

    const visitUnreadCount = useMemo(
        () => notifications.filter((n) => n.unread).length,
        [notifications]
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
            {/* Top Bar: Nav, Title, and Unread Count Pill */}
            <View className="flex-row items-center justify-between gap-2 px-3 py-2">
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
                </View>

                <View className="flex-row items-center gap-1.5 rounded-full bg-active px-3 py-1.5">
                    <Bell size={14} color={colors.primary} />
                    <Text className="text-label-sm font-semibold text-primary">
                        {visitUnreadCount} unread
                    </Text>
                </View>
            </View>

            <ScrollView
                contentContainerClassName="px-4 pb-8 pt-1"
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
                <Text className="mb-4 px-1 text-body-sm text-text-secondary">
                    Keep up with activity around your posts, profile, and communities.
                </Text>

                {/* Notifications Card */}
                <View className="rounded-2xl bg-surface-lowest p-4">
                    {/* Card Header: Recent Activity & Mark all as read */}
                    <View className="mb-4 flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                            <Text className="text-title-md font-semibold text-text-primary">
                                Recent Activity
                            </Text>
                            {Boolean(user?.username) && (
                                <Text className="mt-0.5 text-body-xs text-text-secondary">
                                    Updates for @{user?.username}
                                </Text>
                            )}
                        </View>

                        {visitUnreadCount > 0 && (
                            <Pressable
                                disabled={markAllRead.isPending}
                                onPress={() => markAllRead.mutate()}
                                accessibilityRole="button"
                                accessibilityLabel="Mark all as read"
                                hitSlop={6}
                                className="flex-row items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 active:opacity-70"
                            >
                                <CheckCheck size={15} color={colors.primary} />
                                <Text className="text-label-sm font-semibold text-primary">
                                    Mark all as read
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {isLoading ? (
                        <View className="gap-2.5">
                            {Array.from({ length: 3 }, (_, index) => (
                                <View
                                    key={index}
                                    className="flex-row items-start gap-3 rounded-xl bg-surface-low p-3.5"
                                >
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <View className="flex-1 gap-2 pt-1">
                                        <Skeleton className="h-3.5 w-4/5 rounded-md" />
                                        <Skeleton className="h-3 w-1/3 rounded-md" />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : error ? (
                        <View className="py-6">
                            <Text className="text-center text-body-sm text-error">
                                {error instanceof ApiError
                                    ? error.message
                                    : "Could not load your notifications."}
                            </Text>
                        </View>
                    ) : notifications.length === 0 ? (
                        <View className="items-center py-10">
                            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-active">
                                <Bell size={22} color={colors.primary} />
                            </View>

                            <Text className="text-body-md font-semibold text-text-primary">
                                You&apos;re all caught up
                            </Text>

                            <Text className="mt-1 text-center text-body-xs text-text-secondary">
                                Likes, comments, follows, and community activity will appear here.
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-2.5">
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
                                    className="mt-2 items-center rounded-xl bg-surface-low py-3 active:opacity-70"
                                >
                                    {isLoadingMore ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={colors.primary}
                                        />
                                    ) : (
                                        <Text className="text-label-sm font-semibold text-primary">
                                            Load earlier notifications
                                        </Text>
                                    )}
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
