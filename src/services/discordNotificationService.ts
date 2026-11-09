import notifee, {
    AndroidCategory,
    AndroidImportance,
    AndroidStyle,
    AuthorizationStatus,
    EventType,
    type Event,
} from "react-native-notify-kit";
import { router } from "expo-router";
import { AppState, Platform } from "react-native";

import { markConversationRead, sendMessage } from "@/api/messages";
import { encryptMessageContent } from "@/services/messageCrypto";

export const DISCORD_BLURPLE = "#5865F2";
export const MESSAGES_CHANNEL_ID = "messages";
export const ACTIVITY_CHANNEL_ID = "activity";

let isInitialized = false;
let pendingNotificationData: {
    conversationId: string;
    senderName?: string;
    senderAvatarUrl?: string | null;
} | null = null;
let lastNavigatedConversationId: string | null = null;
let lastNavigatedTime = 0;

/**
 * Navigates directly into a conversation thread, debounced and deferred slightly
 * to ensure navigation containers and root layout have completed transitions.
 */
export function navigateToConversation(
    conversationId: string,
    senderName?: string,
    senderAvatarUrl?: string | null
): void {
    if (!conversationId) return;

    const now = Date.now();
    if (
        lastNavigatedConversationId === conversationId &&
        now - lastNavigatedTime < 1000
    ) {
        return;
    }
    lastNavigatedConversationId = conversationId;
    lastNavigatedTime = now;
    pendingNotificationData = null;

    void dismissDiscordConversationNotification(conversationId);

    setTimeout(() => {
        try {
            router.push({
                pathname: "/messages/[id]",
                params: {
                    id: conversationId,
                    ...(senderName ? { name: senderName } : {}),
                    ...(senderAvatarUrl ? { avatarUrl: senderAvatarUrl } : {}),
                },
            });
        } catch (e) {
            console.warn("[Notifee] Navigation to conversation failed:", e);
        }
    }, 200);
}

/**
 * Queries Notifee for any notification that cold-booted the app from a quit state,
 * or checks for any pending notification click caught while backgrounded.
 */
export async function handleInitialDiscordNotification(): Promise<void> {
    if (Platform.OS === "web") return;

    try {
        if (pendingNotificationData?.conversationId) {
            const data = pendingNotificationData;
            pendingNotificationData = null;
            navigateToConversation(
                data.conversationId,
                data.senderName,
                data.senderAvatarUrl
            );
            return;
        }

        const initial = await notifee.getInitialNotification();
        if (initial?.notification?.data?.conversationId) {
            const data = initial.notification.data;
            const convId = String(data.conversationId);
            navigateToConversation(
                convId,
                data.senderName as string | undefined,
                data.senderAvatarUrl as string | undefined
            );
        }
    } catch (e) {
        console.warn("[Notifee] Failed to handle initial notification:", e);
    }
}

/**
 * Initializes Android notification channels configured with Discord-style styling.
 */
export async function initializeNotificationChannels(): Promise<void> {
    if (Platform.OS !== "android") return;
    if (isInitialized) return;

    try {
        await notifee.createChannel({
            id: MESSAGES_CHANNEL_ID,
            name: "Direct Messages",
            description: "Incoming chat and direct messages",
            importance: AndroidImportance.HIGH,
            vibration: true,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: DISCORD_BLURPLE,
            badge: true,
        });

        await notifee.createChannel({
            id: ACTIVITY_CHANNEL_ID,
            name: "Activity & Notifications",
            description: "Likes, comments, and community updates",
            importance: AndroidImportance.DEFAULT,
            vibration: true,
            badge: true,
        });

        isInitialized = true;
    } catch (e) {
        console.warn("[Notifee] Channel initialization failed:", e);
    }

    try {
        await notifee.requestPermission();
    } catch (e) {
        console.warn("[Notifee] Permission request skipped/failed:", e);
    }
}

/**
 * Checks whether notifications are allowed by Android/iOS system settings.
 */
export async function checkNotificationPermissionStatus(): Promise<{
    enabled: boolean;
    channelBlocked: boolean;
}> {
    if (Platform.OS === "web") {
        return { enabled: true, channelBlocked: false };
    }

    await initializeNotificationChannels();
    try {
        const settings = await notifee.getNotificationSettings();
        const enabled = settings.authorizationStatus !== AuthorizationStatus.DENIED;
        if (Platform.OS === "android") {
            const channel = await notifee.getChannel(MESSAGES_CHANNEL_ID);
            return {
                enabled,
                channelBlocked: Boolean(channel?.blocked),
            };
        }
        return { enabled, channelBlocked: false };
    } catch {
        return { enabled: true, channelBlocked: false };
    }
}

export interface DiscordMessageNotificationPayload {
    conversationId: string;
    messageId: string;
    recipientUsername?: string;
    senderId?: string;
    senderName: string;
    senderAvatarUrl?: string | null;
    text: string;
    timestamp?: number;
    communityName?: string;
    channelName?: string;
}

/**
 * Displays a Discord-style notification in the Android notification drawer / iOS banner.
 * Uses native MessagingStyle with contact avatar, conversation history, and an inline reply text box.
 */
export async function displayDiscordMessageNotification(
    payload: DiscordMessageNotificationPayload
): Promise<void> {
    if (Platform.OS === "web") return;

    await initializeNotificationChannels();

    const notifId = `chat_${payload.conversationId}`;
    const timestamp = payload.timestamp || Date.now();
    const isGroup = Boolean(payload.communityName);
    const conversationTitle = isGroup
        ? `#${payload.channelName || "general"} • ${payload.communityName}`
        : payload.senderName;

    // Fetch any currently displayed notification for this conversation to stack threaded history
    let existingMessages: Array<{
        text: string;
        timestamp: number;
        person?: { name: string; icon?: string };
    }> = [];

    try {
        const displayed = await notifee.getDisplayedNotifications();
        const existing = displayed.find((n) => n.id === notifId);

        if (
            existing?.notification?.android?.style?.type ===
            AndroidStyle.MESSAGING
        ) {
            const prev = existing.notification.android.style.messages;
            if (Array.isArray(prev)) {
                existingMessages = prev.map((m) => {
                    const personObj: { name: string; icon?: string } = {
                        name: m.person?.name || payload.senderName,
                    };
                    if (
                        typeof m.person?.icon === "string" &&
                        m.person.icon.trim().length > 0
                    ) {
                        personObj.icon = m.person.icon.trim();
                    }
                    return {
                        text: m.text,
                        timestamp: m.timestamp,
                        person: personObj,
                    };
                });
            }
        }
    } catch {
        // Fallback to fresh message
    }

    const currentPerson: { name: string; icon?: string } = {
        name: payload.senderName,
    };
    if (
        typeof payload.senderAvatarUrl === "string" &&
        payload.senderAvatarUrl.trim().length > 0
    ) {
        currentPerson.icon = payload.senderAvatarUrl.trim();
    }

    // Append new incoming message
    existingMessages.push({
        text: payload.text,
        timestamp,
        person: currentPerson,
    });

    // Retain up to the 5 most recent messages in the drawer thread
    while (existingMessages.length > 5) {
        existingMessages.shift();
    }

    const messagingStyle: {
        type: AndroidStyle.MESSAGING;
        person: { name: string };
        group: boolean;
        messages: typeof existingMessages;
        title?: string;
    } = {
        type: AndroidStyle.MESSAGING,
        person: {
            name: "Me",
        },
        group: isGroup,
        messages: existingMessages,
    };

    if (isGroup && conversationTitle) {
        messagingStyle.title = conversationTitle;
    }

    const notificationOptions = {
        id: notifId,
        title: conversationTitle,
        body: payload.text,
        data: {
            type: "message",
            conversationId: payload.conversationId,
            messageId: payload.messageId,
            recipientUsername: payload.recipientUsername || "",
            senderId: payload.senderId || "",
            senderName: payload.senderName,
            senderAvatarUrl: payload.senderAvatarUrl || "",
            communityName: payload.communityName || "",
            channelName: payload.channelName || "",
        },
        android: {
            channelId: MESSAGES_CHANNEL_ID,
            category: AndroidCategory.MESSAGE,
            importance: AndroidImportance.HIGH,
            color: DISCORD_BLURPLE,
            smallIcon: "notification_icon",
            timestamp,
            showTimestamp: true,
            pressAction: {
                id: "default",
                launchActivity: "default",
            },
            style: messagingStyle,
            actions: [
                {
                    title: "Reply",
                    pressAction: {
                        id: "reply",
                    },
                    input: {
                        allowFreeFormInput: true,
                        placeholder: `Reply to ${payload.senderName}...`,
                    },
                },
                {
                    title: "Mark as Read",
                    pressAction: {
                        id: "mark_as_read",
                    },
                },
            ],
        },
        ios: {
            categoryId: "message_actions",
        },
    };

    try {
        await notifee.displayNotification(notificationOptions as any);
    } catch (e) {
        console.warn("[Notifee] Primary display failed, attempting fallback without remote icon:", e);
        try {
            // Fallback: strip remote icon in case Android IconCompat failed on URL
            const fallbackMessages = existingMessages.map((m) => ({
                text: m.text,
                timestamp: m.timestamp,
                person: { name: m.person?.name || payload.senderName },
            }));

            const fallbackStyle: {
                type: AndroidStyle.MESSAGING;
                person: { name: string };
                group: boolean;
                messages: typeof fallbackMessages;
                title?: string;
            } = {
                type: AndroidStyle.MESSAGING,
                person: {
                    name: "Me",
                },
                group: isGroup,
                messages: fallbackMessages,
            };

            if (isGroup && conversationTitle) {
                fallbackStyle.title = conversationTitle;
            }

            await notifee.displayNotification({
                ...notificationOptions,
                android: {
                    ...notificationOptions.android,
                    smallIcon: "ic_launcher",
                    style: fallbackStyle,
                },
            } as any);
        } catch (fatalErr) {
            console.error("[Notifee] Fatal notification display failure:", fatalErr);
            throw fatalErr;
        }
    }
}

/**
 * Handles background notification actions: inline reply and mark-as-read.
 * Must be registered at the entry point of the app.
 */
export function registerDiscordBackgroundEventHandler(): void {
    if (Platform.OS === "web") return;

    notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
        if (type === EventType.PRESS) {
            const data = detail.notification?.data;
            const conversationId = data?.conversationId as string | undefined;
            if (conversationId) {
                pendingNotificationData = {
                    conversationId,
                    senderName: data?.senderName as string | undefined,
                    senderAvatarUrl: data?.senderAvatarUrl as string | undefined,
                };
            }
            return;
        }

        if (type === EventType.ACTION_PRESS) {
            const actionId = detail.pressAction?.id;
            const conversationId = detail.notification?.data
                ?.conversationId as string;
            const recipientUsername = detail.notification?.data
                ?.recipientUsername as string;

            if (actionId === "reply") {
                const rawInput = detail.input;
                const replyText =
                    typeof rawInput === "string"
                        ? rawInput.trim()
                        : typeof (rawInput as any)?.text === "string"
                          ? ((rawInput as any).text as string).trim()
                          : "";
                if (replyText && (conversationId || recipientUsername)) {
                    try {
                        const content = recipientUsername
                            ? await encryptMessageContent({
                                  recipientUsername,
                                  plaintext: replyText,
                              })
                            : replyText;

                        if (recipientUsername) {
                            await sendMessage({
                                recipientUsername,
                                content,
                                previewText: replyText,
                            });
                        }

                        // Update the notification in the tray with the sent reply appended
                        const currentMessages =
                            detail.notification?.android?.style?.type ===
                            AndroidStyle.MESSAGING
                                ? detail.notification.android.style.messages ||
                                  []
                                : [];

                        const updatedMessages = [
                            ...currentMessages,
                            {
                                text: replyText,
                                timestamp: Date.now(),
                                person: { name: "You" },
                            },
                        ];

                        while (updatedMessages.length > 5) {
                            updatedMessages.shift();
                        }

                        if (detail.notification) {
                            await notifee.displayNotification({
                                ...detail.notification,
                                android: {
                                    ...detail.notification.android,
                                    style: {
                                        type: AndroidStyle.MESSAGING,
                                        person: { name: "Me" },
                                        messages: updatedMessages,
                                    },
                                },
                            });
                        }
                    } catch (err) {
                        console.error(
                            "[Notifee] Failed to send inline reply from drawer:",
                            err
                        );
                    }
                }
            } else if (actionId === "mark_as_read") {
                if (conversationId) {
                    try {
                        await markConversationRead(conversationId);
                    } catch {}
                    if (detail.notification?.id) {
                        await notifee.cancelNotification(
                            detail.notification.id
                        );
                    }
                }
            }
        }
    });
}

/**
 * Handles foreground notification interactions (tapping the notification banner).
 */
export function registerDiscordForegroundEventHandler(): () => void {
    if (Platform.OS === "web") return () => {};

    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
        if (
            type === EventType.PRESS &&
            detail.notification?.data?.conversationId
        ) {
            const data = detail.notification.data;
            const convId = data.conversationId as string;
            navigateToConversation(
                convId,
                data.senderName as string | undefined,
                data.senderAvatarUrl as string | undefined
            );
        }
    });

    const appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
            void handleInitialDiscordNotification();
        }
    });

    return () => {
        unsubscribe();
        appStateSub.remove();
    };
}

/**
 * Dismisses any presented notifications for a conversation when the user enters the chat.
 */
export async function dismissDiscordConversationNotification(
    conversationId: string
): Promise<void> {
    if (Platform.OS === "web" || !conversationId) return;
    try {
        await notifee.cancelNotification(`chat_${conversationId}`);
        await notifee.cancelNotification(conversationId);
    } catch {
        // ignore
    }
}

/**
 * Dismisses all presented notifications on logout or clear.
 */
export async function dismissAllDiscordNotifications(): Promise<void> {
    if (Platform.OS === "web") return;
    try {
        await notifee.cancelAllNotifications();
        await notifee.setBadgeCount(0);
    } catch {
        // ignore
    }
}
