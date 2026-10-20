import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { requireOptionalNativeModule } from "expo-modules-core";
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
        // Check native modules required by expo-notifications before requiring the JS entry point
        // so older dev-client builds or Expo Go never log a missing native module error.
        if (
            !requireOptionalNativeModule("ExpoPushTokenManager") ||
            !requireOptionalNativeModule("ExpoTopicSubscriptionModule")
        ) {
            cachedNotifications = null;
            return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("expo-notifications") as typeof NotificationsType;
        mod.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
        cachedNotifications = mod;
    } catch {
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
            });
        }

        const existingPermissions = await Notifications.getPermissionsAsync();
        let finalStatus = existingPermissions.status;

        if (finalStatus !== "granted") {
            const requested = await Notifications.requestPermissionsAsync();
            finalStatus = requested.status;
        }

        if (finalStatus !== "granted") {
            return null;
        }

        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        const token = tokenResponse.data;
        if (!token) return null;

        const platform =
            Platform.OS === "ios" || Platform.OS === "android"
                ? Platform.OS
                : "unknown";

        await registerDeviceToken(token, platform);
        await savePushTokenLocally(token);
        return token;
    } catch {
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
