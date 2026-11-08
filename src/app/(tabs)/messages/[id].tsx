import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Lock, ShieldAlert } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    BackHandler,
    Platform,
    Pressable,
    StatusBar,
    Text,
    View,
} from "react-native";
import Animated, {
    useAnimatedKeyboard,
    useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import MessageThread from "@/components/messages/messagethread";
import PresenceLabel from "@/components/messages/presencelabel";
import GradientButton from "@/components/ui/gradientbutton";
import { useChatConnection } from "@/context/chatconnectioncontext";
import { useTheme } from "@/context/themecontext";
import { useConversation } from "@/hooks/useConversation";
import {
    hasCachedRecipientDeviceKeys,
    prefetchRecipientDeviceKeys,
} from "@/services/messageCrypto";
import { dismissConversationNotifications } from "@/services/pushNotifications";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function MessageThreadScreen() {
    const params = useLocalSearchParams<{
        id: string;
        recipientId?: string;
        name?: string;
        username?: string;
        avatarUrl?: string;
        isOnline?: string;
        lastSeenAt?: string;
    }>();
    const id = params.id;
    const insets = useSafeAreaInsets();
    const topInset =
        Platform.OS === "android"
            ? Math.max(insets.top, StatusBar.currentHeight ?? 0)
            : insets.top;
    const bottomInset = insets.bottom;
    const { isDark } = useTheme();
    const { setActiveConversationId } = useChatConnection();
    const [isFocused, setIsFocused] = useState(true);
    const [e2eeStatus, setE2eeStatus] = useState<boolean | null>(null);

    const keyboard = useAnimatedKeyboard({
        isStatusBarTranslucentAndroid: true,
        isNavigationBarTranslucentAndroid: true,
    });
    const animatedContainerStyle = useAnimatedStyle(() => {
        const rawHeight =
            typeof keyboard.height === "number"
                ? keyboard.height
                : (keyboard.height as any)?.value ?? 0;
        return {
            paddingBottom: Math.max(rawHeight, bottomInset),
        };
    }, [bottomInset]);

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
        otherUserLastReadAt,
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
                  id: params.recipientId || "",
                  name: params.name,
                  username: params.username ?? "",
                  avatarUrl: params.avatarUrl || null,
                  isOnline:
                      params.isOnline === undefined
                          ? undefined
                          : params.isOnline === "true",
                  lastSeenAt: params.lastSeenAt || null,
              }
            : undefined);

    useEffect(() => {
        if (!isFocused || !id) return;
        void dismissConversationNotifications(id, resolvedOtherUser?.id);
    }, [isFocused, id, resolvedOtherUser?.id]);

    useEffect(() => {
        if (!isFocused || !resolvedOtherUser?.username) return;
        const cached = hasCachedRecipientDeviceKeys(resolvedOtherUser.username);
        if (cached !== null) {
            setE2eeStatus(cached);
        }
        prefetchRecipientDeviceKeys(resolvedOtherUser.username).then((status) => {
            if (status !== null) {
                setE2eeStatus(status);
            }
        });
    }, [isFocused, resolvedOtherUser?.username]);

    const goBack = useCallback(() => {
        router.replace("/(tabs)/messages");
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
            className="flex-1 bg-surface-lowest"
            style={{ paddingTop: topInset }}
        >
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
                            <View className="flex-row items-center gap-1.5">
                                <Text
                                    numberOfLines={1}
                                    className="text-label-md font-semibold text-text-primary"
                                >
                                    {resolvedOtherUser.name}
                                </Text>
                                {e2eeStatus === true && (
                                    <Lock
                                        size={12}
                                        color={colors.textSecondary}
                                        accessibilityLabel="End-to-end encrypted"
                                    />
                                )}
                                {e2eeStatus === false && (
                                    <ShieldAlert
                                        size={12}
                                        color="#eab308"
                                        accessibilityLabel="Plaintext fallback - recipient has no keys"
                                    />
                                )}
                            </View>

                            <PresenceLabel
                                isOnline={resolvedOtherUser.isOnline}
                                lastSeenAt={resolvedOtherUser.lastSeenAt}
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
            </View>

            {error && messages.length === 0 ? (
                <Animated.View
                    className="flex-1 items-center justify-center bg-surface-low px-6"
                    style={animatedContainerStyle}
                >
                    <Text className="text-center text-body-sm text-error">
                        {error instanceof ApiError
                            ? error.message
                            : "Could not load this conversation."}
                    </Text>

                    <GradientButton
                        onPress={refetch}
                        accessibilityLabel="Try loading this conversation again"
                        label="Try again"
                        className="mt-4 rounded-xl"
                        contentStyle={{ paddingHorizontal: 20, paddingVertical: 10 }}
                        textClassName="text-label-md font-semibold"
                    />
                </Animated.View>
            ) : (
                <Animated.View
                    className="flex-1 bg-surface-lowest"
                    style={animatedContainerStyle}
                >
                    <MessageThread
                        conversationId={id}
                        messages={messages}
                        otherUserLastReadAt={otherUserLastReadAt}
                        recipientId={resolvedOtherUser?.id}
                        recipientUsername={resolvedOtherUser?.username ?? ""}
                        recipientName={resolvedOtherUser?.name}
                        recipientAvatarUrl={resolvedOtherUser?.avatarUrl}
                        isLoading={isLoading && messages.length === 0}
                        isLoadingOlder={isLoadingOlder}
                        onLoadOlder={loadOlder}
                        bottomInset={0}
                    />
                </Animated.View>
            )}
        </View>
    );
}
