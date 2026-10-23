import { HubConnection } from "@microsoft/signalr";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import { queryKeys } from "@/lib/queryKeys";
import {
    createChatConnection,
    NOTIFICATION_CREATED_EVENT,
    PRESENCE_CHANGED_EVENT,
    RECEIVE_MESSAGE_EVENT,
    sendTyping,
    TYPING_CHANGED_EVENT,
} from "@/services/chatHub";
import { getBackupInfo } from "@/services/keyRecovery";
import { decryptMessageContent, ensureDeviceKey } from "@/services/messageCrypto";
import {
    registerCurrentDevicePushToken,
    subscribeToNotificationResponses,
} from "@/services/pushNotifications";
import {
    isRecoveryPromptSettled,
    markRecoveryPromptDismissed,
} from "@/services/recoveryPrompt";
import { Conversation, ConversationThread } from "@/types/message";
import { NotificationItem, NotificationsResponse } from "@/types/notification";
import { themes } from "@/theme/themes";

export type ChatConnectionStatus =
    | "idle"
    | "connecting"
    | "live"
    | "reconnecting"
    | "offline";

type PresencePayload = {
    userId: string;
    isOnline: boolean;
    lastSeenAt?: string | null;
};

type TypingPayload = {
    userId: string;
    isTyping: boolean;
};

type ChatConnectionContextValue = {
    status: ChatConnectionStatus;
    typingUsers: Record<string, number>;
    notifyTyping: (recipientId: string, isTyping: boolean) => boolean;
};

const CONNECT_RETRY_MS = 5_000;
const TYPING_CLAIM_MS = 6_000;
const TYPING_SWEEP_MS = 1_000;

const ChatConnectionContext = createContext<ChatConnectionContextValue>({
    status: "idle",
    typingUsers: {},
    notifyTyping: () => false,
});

function withPresence(
    data: Conversation[] | InfiniteData<ConversationThread> | undefined,
    presence: PresencePayload
) {
    if (!data || !presence?.userId) return data;
    const targetId = presence.userId.toLowerCase();

    if (Array.isArray(data)) {
        let changed = false;
        const next = data.map((conv) => {
            if (conv.otherUser?.id?.toLowerCase() !== targetId) return conv;
            changed = true;
            return {
                ...conv,
                otherUser: {
                    ...conv.otherUser,
                    isOnline: presence.isOnline,
                    lastSeenAt: presence.isOnline
                        ? null
                        : (presence.lastSeenAt ?? conv.otherUser.lastSeenAt),
                },
            };
        });
        return changed ? next : data;
    }

    if ("pages" in data && Array.isArray(data.pages)) {
        let changed = false;
        const nextPages = data.pages.map((page) => {
            if (page.otherUser?.id?.toLowerCase() !== targetId) return page;
            changed = true;
            return {
                ...page,
                otherUser: {
                    ...page.otherUser,
                    isOnline: presence.isOnline,
                    lastSeenAt: presence.isOnline
                        ? null
                        : (presence.lastSeenAt ?? page.otherUser.lastSeenAt),
                },
            };
        });
        return changed ? { ...data, pages: nextPages } : data;
    }

    return data;
}

/**
 * Mobile counterpart of the web's `DeviceKeyPublisher` prompt: once this device has its own key, offer to
 * unlock an existing server backup with the 12-word phrase so pre-existing history renders here. Silent by
 * design — the dismissed/restored flags and every failure of this background check must stay invisible to
 * the signed-in session, exactly like the web toast's silent catch.
 *
 * The prompt renders as an in-app modal rather than a native Alert: the system dim composites over this
 * app's blue-tinted light surfaces, which leaves the backdrop looking light blue, whereas the modal scrim
 * below is a neutral black over the page, matching the recovery card's phrase dialogs.
 */
function dismissRecoveryPrompt() {
    markRecoveryPromptDismissed().catch(() => {});
}

function RecoveryUnlockPrompt({
    visible,
    onLater,
    onUnlock,
}: {
    visible: boolean;
    onLater: () => void;
    onUnlock: () => void;
}) {
    const { isDark } = useTheme();
    const theme = isDark ? themes.dark : themes.light;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onLater}
        >
            {/* This provider sits outside RootNavigator's themed wrapper, so the modal carries the
                theme vars itself — without them every var(--surface-…) resolves to nothing and the
                card paints transparent over the scrim. */}
            <View className="flex-1 justify-center bg-black/50 px-4" style={theme}>
                <View className="rounded-2xl bg-surface-lowest p-5">
                    <Text className="text-title-lg font-semibold text-text-primary">
                        Message Recovery Available
                    </Text>

                    <Text className="mt-1 text-body-sm text-text-secondary">
                        Enter your 12-word recovery phrase to unlock past
                        messages on this device.
                    </Text>

                    <View className="mt-5 flex-row gap-2">
                        <Pressable
                            onPress={onLater}
                            accessibilityRole="button"
                            accessibilityLabel="Later"
                            className="flex-1 items-center rounded-xl border border-border bg-surface-low py-3"
                        >
                            <Text className="text-label-md font-semibold text-text-primary">
                                Later
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={onUnlock}
                            accessibilityRole="button"
                            accessibilityLabel="Unlock"
                            className="flex-1 items-center rounded-xl bg-primary py-3"
                        >
                            <Text className="text-label-md font-semibold text-on-primary">
                                Unlock
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function dropTypingClaim(
    typingUsers: Record<string, number>,
    userId?: string
): Record<string, number> {
    const key = userId?.toLowerCase();
    if (!key || !(key in typingUsers)) return typingUsers;
    const next = { ...typingUsers };
    delete next[key];
    return next;
}

export function ChatConnectionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status: authStatus, user } = useAuth();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<ChatConnectionStatus>("connecting");
    const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
    const [recoveryPromptVisible, setRecoveryPromptVisible] = useState(false);
    const connectionRef = useRef<HubConnection | null>(null);

    const isAuthenticated = authStatus === "authenticated" && Boolean(user);

    useEffect(() => {
        if (!isAuthenticated || !user?.username) return undefined;
        let disposed = false;
        ensureDeviceKey(user.username)
            .then(async () => {
                if (Platform.OS === "web" || disposed) return;
                if (await isRecoveryPromptSettled()) return;
                const backup = await getBackupInfo();
                if (!backup || disposed) return;
                setRecoveryPromptVisible(true);
            })
            // Network or policy failures during the background check must not disrupt the session.
            .catch(() => {});
        registerCurrentDevicePushToken().catch(() => {});
        return () => {
            disposed = true;
        };
    }, [isAuthenticated, user?.username]);

    const handleLaterPress = useCallback(() => {
        dismissRecoveryPrompt();
        setRecoveryPromptVisible(false);
    }, []);

    const handleUnlockPress = useCallback(() => {
        setRecoveryPromptVisible(false);
        // tab must be "settings" too: MessageRecoveryCard (the component that reads
        // recoveryUnlock and opens the phrase dialog) only mounts on the settings tab,
        // and edit-profile defaults to the profile tab — without it the dialog never
        // opens and the param sits on an unmounted card.
        router.push({
            pathname: "/edit-profile",
            params: { recoveryUnlock: "1", tab: "settings" },
        });
    }, []);

    useEffect(() => {
        if (!isAuthenticated || Platform.OS === "web") return undefined;

        return subscribeToNotificationResponses((data) => {
            if (
                data.type === "message" &&
                typeof data.conversationId === "string"
            ) {
                router.push({
                    pathname: "/messages/[id]",
                    params: { id: data.conversationId },
                });
            } else if (data.type === "notification") {
                router.push("/notifications");
            }
        });
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return undefined;

        let disposed = false;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let connecting = false;
        const connection = createChatConnection();
        connectionRef.current = connection;

        connection.on(
            RECEIVE_MESSAGE_EVENT,
            (message?: {
                encryptedPayload?: string | null;
                EncryptedPayload?: string | null;
                conversationId?: string | null;
                ConversationId?: string | null;
            }) => {
                // The event carries the ciphertext, so it can be opened while the refetch below is
                // still in flight. The bubble then mounts with its text already in the settled cache
                // and never shows the decrypt skeleton — which is what a burst of messages used to
                // flash on the receiving end.
                const payload =
                    message?.encryptedPayload ?? message?.EncryptedPayload;
                if (payload) {
                    void decryptMessageContent(payload).catch(() => undefined);
                }

                void queryClient.invalidateQueries({
                    queryKey: queryKeys.conversations(),
                    exact: true,
                });

                const conversationId =
                    message?.conversationId ?? message?.ConversationId;
                if (conversationId) {
                    void queryClient.invalidateQueries({
                        queryKey: queryKeys.conversation(conversationId),
                        refetchType: "active",
                    });
                }
            }
        );

        connection.on(
            PRESENCE_CHANGED_EVENT,
            (presence: PresencePayload) => {
                queryClient.setQueriesData<
                    Conversation[] | InfiniteData<ConversationThread>
                >({ queryKey: queryKeys.conversations() }, (current) =>
                    withPresence(current, presence)
                );
            }
        );

        connection.on(TYPING_CHANGED_EVENT, (typing: TypingPayload) => {
            const key = typing?.userId?.toLowerCase();
            if (!key) return;
            setTypingUsers((current) =>
                typing?.isTyping
                    ? {
                          ...current,
                          [key]: Date.now() + TYPING_CLAIM_MS,
                      }
                    : dropTypingClaim(current, key)
            );
        });

        connection.on(
            NOTIFICATION_CREATED_EVENT,
            (notification?: NotificationItem) => {
                if (notification?.id) {
                    queryClient.setQueryData<
                        InfiniteData<NotificationsResponse>
                    >(queryKeys.notifications(), (current) => {
                        if (!current || !current.pages.length) return current;

                        const firstPage = current.pages[0];
                        const existingItems =
                            firstPage.data?.items ??
                            firstPage.data?.notifications ??
                            [];

                        if (
                            existingItems.some((i) => i.id === notification.id)
                        ) {
                            return current;
                        }

                        return {
                            ...current,
                            pages: current.pages.map((page, index) =>
                                index === 0
                                    ? {
                                          ...page,
                                          data: {
                                              ...page.data,
                                              unreadCount:
                                                  (page.data?.unreadCount ??
                                                      0) + 1,
                                              items: [
                                                  notification,
                                                  ...existingItems,
                                              ],
                                          },
                                      }
                                    : page
                            ),
                        };
                    });
                }

                void queryClient.invalidateQueries({
                    queryKey: queryKeys.notifications(),
                });
            }
        );

        connection.onreconnecting(() => {
            if (!disposed) setStatus("reconnecting");
        });

        connection.onreconnected(() => {
            if (disposed) return;
            setStatus("live");
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations(),
                exact: true,
            });
            void queryClient.invalidateQueries({
                queryKey: queryKeys.notifications(),
            });
        });

        connection.onclose(() => {
            if (!disposed) setStatus("offline");
        });

        function connect() {
            if (disposed || connecting) return;
            connecting = true;

            connection
                .start()
                .then(() => {
                    connecting = false;
                    if (!disposed) setStatus("live");
                })
                .catch(() => {
                    connecting = false;
                    if (disposed) return;
                    setStatus("offline");
                    retryTimer = setTimeout(connect, CONNECT_RETRY_MS);
                });
        }

        connect();

        return () => {
            disposed = true;
            if (retryTimer) clearTimeout(retryTimer);
            connectionRef.current = null;
            connection.off(RECEIVE_MESSAGE_EVENT);
            connection.off(PRESENCE_CHANGED_EVENT);
            connection.off(TYPING_CHANGED_EVENT);
            connection.off(NOTIFICATION_CREATED_EVENT);
            connection.stop().catch(() => {});
            setTypingUsers({});
        };
    }, [isAuthenticated, queryClient]);

    const hasTypingUsers = Object.keys(typingUsers).length > 0;

    useEffect(() => {
        if (!hasTypingUsers) return undefined;

        const timer = setInterval(() => {
            const now = Date.now();
            setTypingUsers((current) => {
                const live = Object.entries(current).filter(
                    ([, expiresAt]) => expiresAt > now
                );
                return live.length === Object.keys(current).length
                    ? current
                    : Object.fromEntries(live);
            });
        }, TYPING_SWEEP_MS);

        return () => clearInterval(timer);
    }, [hasTypingUsers]);

    const notifyTyping = useCallback(
        (recipientId: string, isTyping: boolean) => {
            return sendTyping(connectionRef.current, recipientId, isTyping);
        },
        []
    );

    const value = useMemo<ChatConnectionContextValue>(
        () => ({
            status: isAuthenticated ? status : "idle",
            typingUsers,
            notifyTyping,
        }),
        [isAuthenticated, status, typingUsers, notifyTyping]
    );

    return (
        <ChatConnectionContext.Provider value={value}>
            {children}
            <RecoveryUnlockPrompt
                visible={recoveryPromptVisible}
                onLater={handleLaterPress}
                onUnlock={handleUnlockPress}
            />
        </ChatConnectionContext.Provider>
    );
}

export function useChatConnection() {
    return useContext(ChatConnectionContext);
}
