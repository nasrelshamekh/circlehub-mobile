import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

export const HAPTICS_STORAGE_KEY = "circlehub_haptics_enabled";

let _hapticsEnabled = true;
const _subscribers = new Set<() => void>();

function notifySubscribers() {
    _subscribers.forEach((callback) => callback());
}

// Pre-load persisted haptics preference asynchronously on app launch
if (Platform.OS !== "web") {
    SecureStore.getItemAsync(HAPTICS_STORAGE_KEY)
        .then((val) => {
            if (val !== null) {
                _hapticsEnabled = val === "true";
                notifySubscribers();
            }
        })
        .catch(() => {});
}

export function isHapticsEnabled(): boolean {
    return _hapticsEnabled;
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
    _hapticsEnabled = enabled;
    notifySubscribers();

    if (Platform.OS !== "web") {
        try {
            await SecureStore.setItemAsync(HAPTICS_STORAGE_KEY, String(enabled));
        } catch {}
    }
}

function subscribeHaptics(callback: () => void) {
    _subscribers.add(callback);
    return () => {
        _subscribers.delete(callback);
    };
}

function getHapticsSnapshot(): boolean {
    return _hapticsEnabled;
}

export function useHapticsSetting(): [boolean, (enabled: boolean) => Promise<void>] {
    const enabled = useSyncExternalStore(
        subscribeHaptics,
        getHapticsSnapshot,
        () => true
    );

    return [enabled, setHapticsEnabled];
}

export const haptics = {
    isEnabled: isHapticsEnabled,
    setEnabled: setHapticsEnabled,
    light: () => {
        if (!_hapticsEnabled || Platform.OS === "web") return;
        try {
            const res = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
    medium: () => {
        if (!_hapticsEnabled || Platform.OS === "web") return;
        try {
            const res = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
    selection: () => {
        if (!_hapticsEnabled || Platform.OS === "web") return;
        try {
            const res = Haptics.selectionAsync();
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
    success: () => {
        if (!_hapticsEnabled || Platform.OS === "web") return;
        try {
            const res = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
    error: () => {
        if (!_hapticsEnabled || Platform.OS === "web") return;
        try {
            const res = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
};
