import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    BackHandler,
    Dimensions,
    Keyboard,
    type KeyboardEvent,
    Platform,
    Pressable,
    StatusBar,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import MessageThread from "@/components/messages/messagethread";
import PresenceLabel from "@/components/messages/presencelabel";
import GradientButton from "@/components/ui/gradientbutton";
import { useChatConnection } from "@/context/chatconnectioncontext";
import { useTheme } from "@/context/themecontext";
import { useConversation } from "@/hooks/useConversation";
import { prefetchRecipientDeviceKeys } from "@/services/messageCrypto";
import { dismissConversationNotifications } from "@/services/pushNotifications";
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
    const insets = useSafeAreaInsets();
    const topInset =
        Platform.OS === "android"
            ? Math.max(insets.top, StatusBar.currentHeight ?? 0)
            : insets.top;
    const bottomInset = insets.bottom;
    const { isDark } = useTheme();
    const { setActiveConversationId } = useChatConnection();
    const [isFocused, setIsFocused] = useState(true);
    const [rootHeight, setRootHeight] = useState(
        () => Dimensions.get("window").height
    );
    const [keyboardMetrics, setKeyboardMetrics] = useState<{
        height: number;
        screenY: number;
    } | null>(null);

    useEffect(() => {
        if (Platform.OS === "web") return;

        const handleKeyboardShow = (event: KeyboardEvent) => {
            setKeyboardMetrics({
                height: event.endCoordinates.height,
                screenY: event.endCoordinates.screenY,
            });
        };
        const handleKeyboardHide = () => {
            setKeyboardMetrics(null);
        };

        const subscriptions =
            Platform.OS === "ios"
                ? [
                      Keyboard.addListener("keyboardWillShow", handleKeyboardShow),
                      Keyboard.addListener(
                          "keyboardWillChangeFrame",
                          handleKeyboardShow
                      ),
                      Keyboard.addListener("keyboardWillHide", handleKeyboardHide),
                  ]
                : [
                      Keyboard.addListener("keyboardDidShow", handleKeyboardShow),
                      Keyboard.addListener("keyboardDidHide", handleKeyboardHide),
                  ];

        return () => {
            for (const sub of subscriptions) {
                sub.remove();
            }
        };
    }, []);

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
        prefetchRecipientDeviceKeys(resolvedOtherUser.username);
    }, [isFocused, resolvedOtherUser?.username]);

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

    const isKeyboardOpen = Boolean(
        keyboardMetrics && keyboardMetrics.height > 0
    );
    let keyboardOffset = 0;
    if (isKeyboardOpen && keyboardMetrics) {
        if (keyboardMetrics.screenY > 0 && rootHeight > 0) {
            keyboardOffset = Math.max(rootHeight - keyboardMetrics.screenY, 0);
        } else {
            keyboardOffset = keyboardMetrics.height;
        }
    }
    const bottomSafeOffset = isKeyboardOpen ? keyboardOffset : bottomInset;

    return (
        <View
            className="flex-1 bg-surface-lowest"
            style={{ paddingTop: topInset }}
            onLayout={(event) => {
                const nextHeight = event.nativeEvent.layout.height;
                if (nextHeight > 0 && nextHeight !== rootHeight) {
                    setRootHeight(nextHeight);
                }
            }}
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
                            <Text
                                numberOfLines={1}
                                className="text-label-md font-semibold text-text-primary"
                            >
                                {resolvedOtherUser.name}
                            </Text>

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
                <View
                    className="flex-1 items-center justify-center bg-surface-low px-6"
                    style={
                        bottomSafeOffset > 0
                            ? { paddingBottom: bottomSafeOffset }
                            : undefined
                    }
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
                </View>
            ) : (
                <View className="flex-1 bg-surface-low">
                    <MessageThread
                        messages={messages}
                        recipientId={resolvedOtherUser?.id}
                        recipientUsername={resolvedOtherUser?.username ?? ""}
                        recipientName={resolvedOtherUser?.name}
                        recipientAvatarUrl={resolvedOtherUser?.avatarUrl}
                        isLoading={isLoading && messages.length === 0}
                        isLoadingOlder={isLoadingOlder}
                        onLoadOlder={loadOlder}
                        bottomInset={bottomSafeOffset}
                    />
                </View>
            )}
        </View>
    );
}
