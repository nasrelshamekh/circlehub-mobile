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

// SecureStore has no web implementation, so fall back to localStorage there.
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
            // storage unavailable
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
            // storage unavailable
        }
        return;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Only expire the session if the token used by the failed request is still
// current. This prevents a late 401 from an old request signing out a new login.
export async function expireTokenIfCurrent(token: string) {
    if ((await getToken()) !== token) return false;

    await clearToken();
    notifySessionExpired();
    return true;
}
