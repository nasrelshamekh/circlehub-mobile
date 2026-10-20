import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// The "you have a recovery backup — unlock it on this device" prompt state. Mirrors the web client's two
// localStorage flags (`circlehub-recovery-prompt-dismissed` / `circlehub-recovery-restored`): a flag is
// written when the device settles the prompt itself (restore, or creating the backup here), the dismissed
// flag when the user picks "Later", and both are cleared when the backup is removed so a backup created
// later elsewhere can prompt again. Flags are device-global, not per-account — same rule as the web.
//
// expo-secure-store has no web implementation, and the web client is the React app (which runs its own
// prompt in DeviceKeyPublisher), so every helper here is a no-op on web: `isRecoveryPromptSettled`
// answers "settled" to keep the prompt quiet there.
const PROMPT_FLAGS_SUPPORTED = Platform.OS !== "web";

const PROMPT_DISMISSED_KEY = "circlehub-recovery-prompt-dismissed";
const PROMPT_RESTORED_KEY = "circlehub-recovery-restored";

export async function isRecoveryPromptSettled(): Promise<boolean> {
    if (!PROMPT_FLAGS_SUPPORTED) return true;
    const [dismissed, restored] = await Promise.all([
        SecureStore.getItemAsync(PROMPT_DISMISSED_KEY),
        SecureStore.getItemAsync(PROMPT_RESTORED_KEY),
    ]);
    return Boolean(dismissed || restored);
}

export async function markRecoveryPromptDismissed(): Promise<void> {
    if (!PROMPT_FLAGS_SUPPORTED) return;
    await SecureStore.setItemAsync(PROMPT_DISMISSED_KEY, "1");
}

/** A restore means this device now holds the backed-up key: the prompt must never fire again here. */
export async function markRecoveryRestored(): Promise<void> {
    if (!PROMPT_FLAGS_SUPPORTED) return;
    await SecureStore.setItemAsync(PROMPT_RESTORED_KEY, "1");
    await SecureStore.setItemAsync(PROMPT_DISMISSED_KEY, "1");
}

export async function clearRecoveryPromptFlags(): Promise<void> {
    if (!PROMPT_FLAGS_SUPPORTED) return;
    await SecureStore.deleteItemAsync(PROMPT_DISMISSED_KEY);
    await SecureStore.deleteItemAsync(PROMPT_RESTORED_KEY);
}
