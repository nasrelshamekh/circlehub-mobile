import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener) {
    sessionExpiredListeners.add(listener);
    return () => {
        sessionExpiredListeners.delete(listener);
    };
}

function notifySessionExpired() {
    sessionExpiredListeners.forEach((listener) => listener());
}

export async function getToken() {
    if (Platform.OS === "web") {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    }

    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
    if (Platform.OS === "web") {
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch {
        }
        return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
    if (Platform.OS === "web") {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch {
        }
        return;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function expireTokenIfCurrent(token: string) {
    if ((await getToken()) !== token) return false;

    await clearToken();
    notifySessionExpired();
    return true;
}
