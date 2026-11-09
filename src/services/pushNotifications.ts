import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import type * as NotificationsType from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { registerDeviceToken, unregisterDeviceToken } from "@/api/devices";
import {
    dismissAllDiscordNotifications,
    dismissDiscordActivityNotification,
    dismissDiscordConversationNotification,
    displayDiscordActivityNotification,
    displayDiscordMessageNotification,
    initializeNotificationChannels,
} from "@/services/discordNotificationService";

const PUSH_TOKEN_KEY = "circlehub_push_token";
let cachedPushToken: string | null = null;
let cachedNotifications: typeof NotificationsType | null | undefined;

function isRunningInExpoGo(): boolean {
    return (
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
        Constants.appOwnership === "expo"
    );
}

function getNotifications(): typeof NotificationsType | null {
    if (Platform.OS === "web" || isRunningInExpoGo()) return null;
    if (cachedNotifications !== undefined) return cachedNotifications;

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("expo-notifications") as typeof NotificationsType;
        mod.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: false,
                shouldShowBanner: false,
                shouldShowList: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
            }),
        });
        cachedNotifications = mod;
    } catch (e) {
        console.warn("[Push] Failed to load expo-notifications:", e);
        cachedNotifications = null;
    }

    return cachedNotifications;
}

export const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";

const processedNotificationIds = new Map<string, number>();

function isDuplicatePayload(id: string): boolean {
    if (!id) return false;
    const now = Date.now();
    for (const [k, ts] of processedNotificationIds.entries()) {
        if (now - ts > 30000) {
            processedNotificationIds.delete(k);
        }
    }
    if (processedNotificationIds.has(id)) {
        return true;
    }
    processedNotificationIds.set(id, now);
    return false;
}

/**
 * Checks whether a string value is a serialized JSON payload object/array,
 * so we never accidentally render raw JSON code on user notification cards.
 */
export function isSerializedPayload(val: unknown): boolean {
    if (typeof val !== "string") return false;
    const trimmed = val.trim();
    if (trimmed.length < 2) return false;
    if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object") {
                if (
                    "notificationId" in parsed ||
                    "notificationType" in parsed ||
                    "conversationId" in parsed ||
                    "senderName" in parsed ||
                    "actorUsername" in parsed ||
                    (parsed as any).type === "notification" ||
                    (parsed as any).type === "message" ||
                    "postId" in parsed ||
                    "communitySlug" in parsed
                ) {
                    return true;
                }
            }
        } catch {
            if (
                trimmed.includes('"notificationId"') ||
                trimmed.includes('"notificationType"') ||
                trimmed.includes('"conversationId"') ||
                trimmed.includes('"type":')
            ) {
                return true;
            }
        }
    }
    if (
        trimmed.startsWith('{"') &&
        (trimmed.includes('"notificationId"') ||
            trimmed.includes('"type"') ||
            trimmed.includes('"senderName"'))
    ) {
        return true;
    }
    return false;
}

/**
 * Unpacks nested or JSON-stringified payloads from Expo / FCM background delivery.
 * Android FCM and Expo push services often wrap payloads in { body: "{...}" } or { data: "{...}" }.
 */
export function unpackPayload(
    raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
    if (!raw || typeof raw !== "object") return {};
    let data: Record<string, unknown> = { ...raw };

    // 1. If wrapped in a Notification or Request envelope
    const req = (data.notification as any)?.request || (data.request as any);
    const content = req?.content || (data.content as any);
    if (content && typeof content === "object") {
        if (content.data && typeof content.data === "object") {
            data = { ...data, ...content.data };
        }
        if (typeof content.body === "string" && content.body.trim().length > 0) {
            data.body = data.body || content.body;
        }
    }

    // 2. If data.data exists (Expo / FCM nested payload)
    if (data.data) {
        if (typeof data.data === "object" && data.data !== null) {
            data = { ...data, ...(data.data as Record<string, unknown>) };
        } else if (
            typeof data.data === "string" &&
            data.data.trim().startsWith("{")
        ) {
            try {
                const parsed = JSON.parse(data.data.trim());
                if (parsed && typeof parsed === "object") {
                    data = { ...data, ...(parsed as Record<string, unknown>) };
                }
            } catch {}
        }
    }

    // 3. If body is a JSON string
    if (typeof data.body === "string" && data.body.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(data.body.trim());
            if (parsed && typeof parsed === "object") {
                const parsedObj = parsed as Record<string, unknown>;
                data = { ...data, ...parsedObj };
                if (
                    typeof parsedObj.text === "string" &&
                    !isSerializedPayload(parsedObj.text)
                ) {
                    data.text = parsedObj.text.trim();
                } else if (
                    typeof parsedObj.body === "string" &&
                    !isSerializedPayload(parsedObj.body)
                ) {
                    data.body = parsedObj.body.trim();
                } else {
                    delete data.body;
                }
            }
        } catch {}
    }

    // 4. If text is a JSON string
    if (typeof data.text === "string" && data.text.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(data.text.trim());
            if (parsed && typeof parsed === "object") {
                const parsedObj = parsed as Record<string, unknown>;
                data = { ...data, ...parsedObj };
                if (
                    typeof parsedObj.text === "string" &&
                    !isSerializedPayload(parsedObj.text)
                ) {
                    data.text = parsedObj.text.trim();
                } else {
                    delete data.text;
                }
            }
        } catch {}
    }

    // 5. Sanitize any lingering raw serialized JSON code
    if (isSerializedPayload(data.body)) {
        delete data.body;
    }
    if (isSerializedPayload(data.text)) {
        delete data.text;
    }
    if (isSerializedPayload(data.senderName)) {
        delete data.senderName;
    }

    return data;
}

export async function handleIncomingDiscordPayload(
    raw: Record<string, unknown> | null | undefined
): Promise<void> {
    if (!raw) return;
    const rawData = unpackPayload(raw);

    const type = stringField(rawData, "type", "Type")?.toLowerCase();
    const conversationId = stringField(
        rawData,
        "conversationId",
        "ConversationId"
    );

    if (type === "message" || conversationId) {
        if (!conversationId) return;

        const messageId =
            stringField(rawData, "messageId", "MessageId") || "";
        const dedupKey = `msg_${conversationId}_${messageId || Date.now()}`;
        if (messageId && isDuplicatePayload(dedupKey)) {
            return;
        }

        let senderName =
            stringField(rawData, "senderName", "SenderName") ||
            "New message";
        if (isSerializedPayload(senderName)) {
            senderName = "New message";
        }
        const senderUsername = stringField(
            rawData,
            "senderUsername",
            "SenderUsername"
        );
        const senderAvatarUrl =
            stringField(
                rawData,
                "senderAvatarUrl",
                "SenderAvatarUrl",
                "avatarUrl",
                "AvatarUrl"
            ) || null;
        let text =
            stringField(rawData, "text", "Text", "body", "Body") ||
            "Sent you a message";
        if (isSerializedPayload(text)) {
            text = "Sent you a message";
        }
        const senderId = stringField(rawData, "senderId", "SenderId");

        await displayDiscordMessageNotification({
            conversationId,
            messageId,
            recipientUsername: senderUsername || undefined,
            senderId: senderId || undefined,
            senderName,
            senderAvatarUrl,
            text,
        });
    } else {
        const notificationId =
            stringField(
                rawData,
                "notificationId",
                "NotificationId",
                "id",
                "Id"
            ) || String(Date.now());

        const dedupKey = `notif_${notificationId}`;
        if (isDuplicatePayload(dedupKey)) {
            return;
        }

        const notificationType =
            stringField(
                rawData,
                "notificationType",
                "NotificationType"
            ) || "General";
        let senderName =
            stringField(
                rawData,
                "senderName",
                "SenderName",
                "actorName",
                "ActorName",
                "title",
                "Title"
            ) || "CircleHub";
        if (isSerializedPayload(senderName)) {
            senderName = "CircleHub";
        }
        const senderAvatarUrl =
            stringField(
                rawData,
                "senderAvatarUrl",
                "SenderAvatarUrl",
                "actorAvatarUrl",
                "ActorAvatarUrl",
                "avatarUrl",
                "AvatarUrl"
            ) || null;
        let text = stringField(
            rawData,
            "text",
            "Text",
            "body",
            "Body",
            "sentence",
            "Sentence",
            "message",
            "Message"
        );
        if (!text || text === "New notification" || isSerializedPayload(text)) {
            const rawSender =
                senderName && senderName !== "CircleHub"
                    ? senderName
                    : "Someone";
            switch (notificationType) {
                case "PostLike":
                    text = `${rawSender} liked your post.`;
                    break;
                case "CommentLike":
                    text = `${rawSender} liked your comment.`;
                    break;
                case "PostComment":
                    text = `${rawSender} commented on your post.`;
                    break;
                case "Follow":
                    text = `${rawSender} started following you.`;
                    break;
                case "CommunityJoinRequested":
                    text = `${rawSender} requested to join the community.`;
                    break;
                case "CommunityJoinRequestApproved":
                    text = `${rawSender} approved your request to join the community.`;
                    break;
                case "CommunityJoinRequestRejected":
                    text = `${rawSender} declined your request to join the community.`;
                    break;
                case "CommunityMemberRemoved":
                    text = `${rawSender} removed you from the community.`;
                    break;
                case "CommunityRoleChanged":
                    text = `${rawSender} updated your role in the community.`;
                    break;
                case "CommunityPostRemoved":
                    text = `${rawSender} removed your post from the community.`;
                    break;
                default:
                    text =
                        senderName !== "CircleHub"
                            ? `${senderName} sent you a notification.`
                            : "New notification";
                    break;
            }
        }
        const postId = stringField(rawData, "postId", "PostId");
        const communitySlug = stringField(
            rawData,
            "communitySlug",
            "CommunitySlug"
        );
        const actorUsername = stringField(
            rawData,
            "actorUsername",
            "ActorUsername"
        );

        await displayDiscordActivityNotification({
            notificationId,
            notificationType,
            senderName,
            senderAvatarUrl,
            text,
            postId,
            communitySlug,
            actorUsername,
        });
    }
}

if (Platform.OS !== "web" && !isRunningInExpoGo()) {
    try {
        const Notifications = getNotifications();

        if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
            TaskManager.defineTask(
                BACKGROUND_NOTIFICATION_TASK,
                async ({ data, error }: any) => {
                    if (error || !data) return;
                    const req = data?.notification?.request;
                    const content = req?.content;
                    const rawData =
                        (content?.data as Record<string, unknown> | undefined) ||
                        (data?.data as Record<string, unknown> | undefined) ||
                        (data as Record<string, unknown> | undefined);
                    await handleIncomingDiscordPayload(rawData);
                }
            );
        }

        if (Notifications?.registerTaskAsync) {
            void Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(
                () => {}
            );
        }

        if (Notifications?.addNotificationReceivedListener) {
            Notifications.addNotificationReceivedListener((notification) => {
                const content = notification?.request?.content;
                const rawData =
                    (content?.data as Record<string, unknown> | undefined) ||
                    (notification as any)?.data;
                void handleIncomingDiscordPayload(rawData);
            });
        }
    } catch {
        // ignore
    }
}

async function savePushTokenLocally(token: string): Promise<void> {
    cachedPushToken = token;
    if (Platform.OS === "web") return;
    try {
        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    } catch {
        // ignore
    }
}

async function getSavedPushToken(): Promise<string | null> {
    if (cachedPushToken) return cachedPushToken;
    if (Platform.OS === "web") return null;
    try {
        return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    } catch {
        return null;
    }
}

async function clearSavedPushToken(): Promise<void> {
    cachedPushToken = null;
    if (Platform.OS === "web") return;
    try {
        await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    } catch {
        // ignore
    }
}

function stringField(
    source: Record<string, unknown> | null | undefined,
    ...keys: string[]
): string | undefined {
    if (!source) return undefined;
    for (const key of keys) {
        const val = source[key];
        if (typeof val === "string" && val.trim().length > 0) {
            return val.trim();
        }
    }
    return undefined;
}

function parseForeignIdentifierTag(identifier: string): string | undefined {
    if (!identifier.startsWith("expo-notifications://foreign_notifications")) {
        return undefined;
    }
    const queryIdx = identifier.indexOf("?");
    if (queryIdx < 0) return undefined;
    const query = identifier.slice(queryIdx + 1);
    for (const part of query.split("&")) {
        const eqIdx = part.indexOf("=");
        if (eqIdx < 0) continue;
        const k = decodeURIComponent(part.slice(0, eqIdx));
        if (k === "tag") {
            const v = decodeURIComponent(part.slice(eqIdx + 1)).trim();
            return v.length > 0 ? v : undefined;
        }
    }
    return undefined;
}

export interface PresentedNotificationMeta {
    identifier: string;
    isMessage: boolean;
    conversationId?: string;
    senderId?: string;
    notificationId?: string;
    tag?: string;
}

export function extractPresentedNotificationMeta(
    notification: NotificationsType.Notification
): PresentedNotificationMeta {
    const identifier = String(notification?.request?.identifier ?? "");
    const rawContentData = notification?.request?.content?.data;
    let merged: Record<string, unknown> =
        rawContentData && typeof rawContentData === "object"
            ? { ...(rawContentData as Record<string, unknown>) }
            : {};

    // In Android's foreign-notification fallback, Expo's JSON payload string is stored under `body`.
    if (typeof merged.body === "string" && merged.body.trim().startsWith("{")) {
        try {
            const parsedBody = JSON.parse(merged.body) as unknown;
            if (parsedBody && typeof parsedBody === "object") {
                merged = {
                    ...merged,
                    ...(parsedBody as Record<string, unknown>),
                };
            }
        } catch {
            // ignore malformed JSON
        }
    }

    const trigger = notification?.request?.trigger as
        | Record<string, unknown>
        | null
        | undefined;
    const remoteMessage =
        trigger && typeof trigger.remoteMessage === "object" && trigger.remoteMessage
            ? (trigger.remoteMessage as Record<string, unknown>)
            : undefined;
    const remoteData =
        remoteMessage && typeof remoteMessage.data === "object" && remoteMessage.data
            ? (remoteMessage.data as Record<string, unknown>)
            : undefined;

    const foreignTag = parseForeignIdentifierTag(identifier);
    const identifierChatTag = identifier.toLowerCase().startsWith("chat_")
        ? identifier
        : undefined;
    const tag =
        stringField(merged, "tag", "Tag") ??
        stringField(remoteData, "tag", "Tag") ??
        foreignTag ??
        identifierChatTag;

    const tagConversationId =
        tag && tag.toLowerCase().startsWith("chat_") && tag.length > 5
            ? tag.slice(5).trim()
            : undefined;

    const conversationId =
        stringField(merged, "conversationId", "ConversationId") ??
        tagConversationId;
    const senderId = stringField(merged, "senderId", "SenderId");
    const notificationId = stringField(
        merged,
        "notificationId",
        "NotificationId"
    );

    const type = stringField(merged, "type", "Type")?.toLowerCase();
    const channelId = (
        stringField(merged, "channelId", "ChannelId") ??
        stringField(trigger ?? undefined, "channelId", "ChannelId") ??
        stringField(remoteData, "channelId", "ChannelId")
    )?.toLowerCase();

    const isMessage =
        type === "message" ||
        Boolean(conversationId) ||
        channelId === "messages";

    return {
        identifier,
        isMessage,
        conversationId,
        senderId,
        notificationId,
        tag,
    };
}

async function syncTrayBadgeIfEmpty(
    Notifications: typeof NotificationsType,
    totalPresented: number,
    dismissedCount: number
): Promise<void> {
    if (dismissedCount > 0 && dismissedCount >= totalPresented) {
        try {
            await Notifications.setBadgeCountAsync?.(0);
        } catch {
            // ignore
        }
    }
}

export async function dismissConversationNotifications(
    conversationId: string | null | undefined,
    senderId?: string | null
): Promise<void> {
    if (!conversationId) return;
    const targetConvId = String(conversationId).trim().toLowerCase();
    if (!targetConvId) return;
    const targetSenderId = senderId ? String(senderId).trim().toLowerCase() : "";

    void dismissDiscordConversationNotification(targetConvId);

    const Notifications = getNotifications();
    if (!Notifications) return;

    try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        if (!Array.isArray(presented) || presented.length === 0) return;

        const identifiersToDismiss: string[] = [];
        for (const item of presented) {
            const meta = extractPresentedNotificationMeta(item);
            if (!meta.identifier || !meta.isMessage) continue;

            const matchesConv =
                meta.conversationId?.toLowerCase() === targetConvId ||
                meta.identifier.trim().toLowerCase() === `chat_${targetConvId}`;
            const matchesSenderFallback =
                !meta.conversationId &&
                Boolean(targetSenderId) &&
                meta.senderId?.toLowerCase() === targetSenderId;

            if (matchesConv || matchesSenderFallback) {
                identifiersToDismiss.push(meta.identifier);
            }
        }

        if (identifiersToDismiss.length === 0) return;

        await Promise.allSettled(
            identifiersToDismiss.map((id) =>
                Notifications.dismissNotificationAsync(id)
            )
        );
        await syncTrayBadgeIfEmpty(
            Notifications,
            presented.length,
            identifiersToDismiss.length
        );
    } catch {
        // Best-effort status bar cleanup
    }
}

export async function dismissActivityNotifications(
    notificationId?: string | null
): Promise<void> {
    void dismissDiscordActivityNotification(notificationId || undefined);
    const Notifications = getNotifications();
    if (!Notifications) return;

    const targetNotifId = notificationId
        ? String(notificationId).trim().toLowerCase()
        : "";

    try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        if (!Array.isArray(presented) || presented.length === 0) return;

        const identifiersToDismiss: string[] = [];
        for (const item of presented) {
            const meta = extractPresentedNotificationMeta(item);
            if (!meta.identifier || meta.isMessage) continue;

            if (targetNotifId) {
                if (meta.notificationId?.toLowerCase() === targetNotifId) {
                    identifiersToDismiss.push(meta.identifier);
                }
            } else {
                identifiersToDismiss.push(meta.identifier);
            }
        }

        if (identifiersToDismiss.length === 0) return;

        await Promise.allSettled(
            identifiersToDismiss.map((id) =>
                Notifications.dismissNotificationAsync(id)
            )
        );
        await syncTrayBadgeIfEmpty(
            Notifications,
            presented.length,
            identifiersToDismiss.length
        );
    } catch {
        // Best-effort status bar cleanup
    }
}

export async function dismissAllPresentedNotifications(): Promise<void> {
    void dismissAllDiscordNotifications();
    const Notifications = getNotifications();
    if (!Notifications) return;

    try {
        await Notifications.dismissAllNotificationsAsync();
        await Notifications.setBadgeCountAsync?.(0);
    } catch {
        // ignore
    }
}

export function subscribeToNotificationResponses(
    onData: (data: Record<string, unknown>) => void
): () => void {
    const Notifications = getNotifications();
    if (!Notifications) return () => {};

    const handleTappedData = (data: Record<string, unknown> | undefined) => {
        if (!data) return;
        const type = stringField(data, "type", "Type")?.toLowerCase();
        const convId = stringField(data, "conversationId", "ConversationId");
        if (type === "message" && convId) {
            void dismissConversationNotifications(convId);
        } else if (type === "notification") {
            void dismissActivityNotifications();
        }
        onData(data);
    };

    try {
        // Handle cold start when user taps a notification while app was completely closed
        Notifications.getLastNotificationResponseAsync()
            .then((response) => {
                if (response) {
                    const data = response.notification.request.content.data as
                        | Record<string, unknown>
                        | undefined;
                    handleTappedData(data);
                }
            })
            .catch(() => {});

        const sub = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data as
                    | Record<string, unknown>
                    | undefined;
                handleTappedData(data);
            }
        );
        return () => {
            sub.remove();
        };
    } catch {
        return () => {};
    }
}

export async function registerCurrentDevicePushToken(): Promise<string | null> {
    if (Platform.OS === "web" || !Device.isDevice || isRunningInExpoGo()) {
        return null;
    }

    const Notifications = getNotifications();
    if (!Notifications) return null;

    try {
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "Default",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#6366F1",
            });

            await Notifications.setNotificationChannelAsync("messages", {
                name: "Messages",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#6366F1",
                enableLights: true,
                showBadge: true,
            });
        }

        const existingPermissions = await Notifications.getPermissionsAsync();
        let finalStatus = existingPermissions.status;

        if (finalStatus !== "granted") {
            const requested = await Notifications.requestPermissionsAsync();
            finalStatus = requested.status;
        }

        if (finalStatus !== "granted") {
            console.warn("[Push] Notification permission not granted:", finalStatus);
            return null;
        }

        await initializeNotificationChannels();

        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId ??
            "e785b374-5326-4afc-86ef-af5cf6c6772c";

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        const token = tokenResponse.data;

        if (!token) {
            console.warn("[Push] No token returned from getExpoPushTokenAsync");
            return null;
        }

        const platform =
            Platform.OS === "ios" || Platform.OS === "android"
                ? Platform.OS
                : "unknown";

        await registerDeviceToken(token, platform);
        await savePushTokenLocally(token);
        console.log("[Push] Successfully registered device push token:", token);
        return token;
    } catch (error) {
        console.error("[Push] Error registering push token:", error);
        return null;
    }
}

export async function unregisterCurrentDevicePushToken(): Promise<void> {
    await dismissAllPresentedNotifications();
    const token = await getSavedPushToken();
    await clearSavedPushToken();
    if (!token) return;

    try {
        await unregisterDeviceToken(token);
    } catch {
        // Best-effort on sign-out; server also prunes DeviceNotRegistered tokens automatically.
    }
}
