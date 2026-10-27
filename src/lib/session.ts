import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

let cachedToken: string | null | undefined = undefined;
let inFlightTokenPromise: Promise<string | null> | null = null;

export function onSessionExpired(listener: SessionExpiredListener) {
    sessionExpiredListeners.add(listener);
    return () => {
        sessionExpiredListeners.delete(listener);
    };
}

function notifySessionExpired() {
    sessionExpiredListeners.forEach((listener) => listener());
}

export async function getToken(): Promise<string | null> {
    if (cachedToken !== undefined) {
        return cachedToken;
    }

    if (Platform.OS === "web") {
        try {
            cachedToken = localStorage.getItem(TOKEN_KEY);
            return cachedToken;
        } catch {
            return null;
        }
    }

    if (!inFlightTokenPromise) {
        inFlightTokenPromise = SecureStore.getItemAsync(TOKEN_KEY)
            .then((value) => {
                if (cachedToken === undefined) {
                    cachedToken = value;
                }
                return cachedToken ?? null;
            })
            .finally(() => {
                inFlightTokenPromise = null;
            });
    }

    return inFlightTokenPromise;
}

export async function setToken(token: string) {
    cachedToken = token;
    inFlightTokenPromise = null;

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
    cachedToken = null;
    inFlightTokenPromise = null;

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
