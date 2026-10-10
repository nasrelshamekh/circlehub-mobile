import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

// Expo SecureStore has no web implementation, so fall back to localStorage
// there. Native (the actual target) stays on the encrypted keychain/keystore.
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
            // storage unavailable (private mode, etc.) — nothing we can do
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
            // storage unavailable — nothing we can do
        }
        return;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
}
