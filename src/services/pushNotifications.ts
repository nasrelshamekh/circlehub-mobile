import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import type * as NotificationsType from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { registerDeviceToken, unregisterDeviceToken } from "@/api/devices";

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
                shouldShowBanner: false,
                shouldShowList: true,
                shouldPlaySound: true,
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

export function subscribeToNotificationResponses(
    onData: (data: Record<string, unknown>) => void
): () => void {
    const Notifications = getNotifications();
    if (!Notifications) return () => {};

    try {
        // Handle cold start when user taps a notification while app was completely closed
        Notifications.getLastNotificationResponseAsync()
            .then((response) => {
                if (response) {
                    const data = response.notification.request.content.data as
                        | Record<string, unknown>
                        | undefined;
                    if (data) {
                        onData(data);
                    }
                }
            })
            .catch(() => {});

        const sub = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data as
                    | Record<string, unknown>
                    | undefined;
                if (data) {
                    onData(data);
                }
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
    const token = await getSavedPushToken();
    await clearSavedPushToken();
    if (!token) return;

    try {
        await unregisterDeviceToken(token);
    } catch {
        // Best-effort on sign-out; server also prunes DeviceNotRegistered tokens automatically.
    }
}
