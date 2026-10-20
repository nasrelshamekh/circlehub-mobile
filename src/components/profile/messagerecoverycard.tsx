import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, router, useLocalSearchParams } from "expo-router";
import {
    Check,
    Copy,
    KeyRound,
    RefreshCw,
    ShieldCheck,
    Trash2,
    Unlock,
    X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { KeyBackupDto } from "@/api/keys";
import { useTheme } from "@/context/themecontext";
import { formatPostDate } from "@/lib/formatPostDate";
import { queryKeys } from "@/lib/queryKeys";
import {
    getBackupInfo,
    hasValidChecksum,
    initializeRecovery,
    isWellFormedPhrase,
    normalisePhrase,
    removeBackup,
    restoreRecovery,
} from "@/services/keyRecovery";
import {
    clearRecoveryPromptFlags,
    markRecoveryPromptDismissed,
    markRecoveryRestored,
} from "@/services/recoveryPrompt";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function MessageRecoveryCard() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const queryClient = useQueryClient();

    const [backupInfo, setBackupInfo] = useState<KeyBackupDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(false);

    const [setupModalOpen, setSetupModalOpen] = useState(false);
    const [generatedPhrase, setGeneratedPhrase] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [confirmedSaved, setConfirmedSaved] = useState(false);
    const [copiedPhrase, setCopiedPhrase] = useState(false);

    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [restoreInput, setRestoreInput] = useState("");
    const [restoring, setRestoring] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);

    const [removeModalOpen, setRemoveModalOpen] = useState(false);

    const recoveryUnlockParam =
        useLocalSearchParams<{ recoveryUnlock?: string }>().recoveryUnlock;

    // Arriving from the sign-in unlock prompt: the phrase dialog opens straight away, the way the web
    // toast's "Unlock" action opens RecoveryRestoreDialog directly. Visibility is derived from the route
    // param rather than copied into state — an effect that called setState here would cascade renders —
    // and closing clears the param so the route, and a later prompt, start clean.
    const restoreFromPrompt = recoveryUnlockParam === "1";

    function closeRestoreModal() {
        setRestoreModalOpen(false);
        setRestoreInput("");
        setRestoreError(null);
        if (restoreFromPrompt) {
            router.setParams({ recoveryUnlock: undefined });
        }
    }

    const refreshStatus = useCallback(async () => {
        setLoading(true);
        try {
            const info = await getBackupInfo();
            setBackupInfo(info);
        } catch {
            setBackupInfo(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void refreshStatus();
        }, [refreshStatus])
    );

    async function handleOpenSetup() {
        setSetupModalOpen(true);
        setGeneratedPhrase(null);
        setConfirmedSaved(false);
        setCopiedPhrase(false);
        setGenerating(true);

        try {
            const result = await initializeRecovery();
            setGeneratedPhrase(result.phrase);
            await refreshStatus();
            // The backup was created from this device's key, so it already reads its own history:
            // the sign-in unlock prompt must never fire here.
            markRecoveryPromptDismissed().catch(() => {});
        } catch (error) {
            setSetupModalOpen(false);
            Alert.alert(
                "Backup failed",
                error instanceof ApiError
                    ? error.message
                    : "Could not initialize key recovery."
            );
        } finally {
            setGenerating(false);
        }
    }

    async function handleCopyPhrase() {
        if (!generatedPhrase) return;
        await Clipboard.setStringAsync(generatedPhrase);
        setCopiedPhrase(true);
        setTimeout(() => setCopiedPhrase(false), 2000);
    }

    // The confirm is an in-app dialog rather than a native Alert: the system dim composites over this
    // app's blue-tinted light surfaces, which leaves the backdrop looking light blue, whereas the modal
    // scrim below is a neutral black over the page, matching the phrase dialogs it sits beside.
    function handleRemoveBackup() {
        setRemoveModalOpen(true);
    }

    async function confirmRemoveBackup() {
        setRemoving(true);
        try {
            await removeBackup();
            setBackupInfo(null);
            setRemoveModalOpen(false);
            // Mirror the web card: with no backup the flags must reset, so a backup created later
            // (possibly elsewhere) can prompt this device again.
            await clearRecoveryPromptFlags().catch(() => {});
        } catch (error) {
            setRemoveModalOpen(false);
            Alert.alert(
                "Error",
                error instanceof ApiError
                    ? error.message
                    : "Could not remove key backup."
            );
        } finally {
            setRemoving(false);
        }
    }

    const typedWords = normalisePhrase(restoreInput)
        .split(" ")
        .filter(Boolean);
    const wellFormed = isWellFormedPhrase(restoreInput);
    const checksumOk = wellFormed && hasValidChecksum(restoreInput);

    async function handleRestoreSubmit() {
        if (!checksumOk || restoring) return;
        setRestoring(true);
        setRestoreError(null);

        try {
            await restoreRecovery(restoreInput);
            await markRecoveryRestored().catch(() => {});
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations(),
            });
            closeRestoreModal();
            await refreshStatus();
            Alert.alert(
                "Recovery complete",
                "Your recovery phrase was verified and this device is now registered for encrypted messages."
            );
        } catch (error) {
            setRestoreError(
                error instanceof Error
                    ? error.message
                    : "Recovery failed. Check your 12-word phrase and try again."
            );
        } finally {
            setRestoring(false);
        }
    }

    const words = generatedPhrase ? generatedPhrase.split(" ") : [];

    return (
        <View className="mt-4 gap-4 rounded-2xl bg-surface-lowest p-4">
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                    <View className="flex-row items-start gap-2">
                        <View className="mt-1">
                            <ShieldCheck size={18} color={colors.primary} />
                        </View>
                        <Text className="flex-1 text-title-lg font-semibold text-text-primary">
                            {"Encrypted Message\nRecovery"}
                        </Text>
                    </View>

                    <Text className="mt-1.5 text-body-sm text-text-secondary">
                        Protect your end-to-end encrypted key vault with a
                        12-word recovery phrase so you can unlock your account
                        key across browsers and mobile devices.
                    </Text>
                </View>

                <View
                    className={
                        backupInfo
                            ? "rounded-full bg-active px-2.5 py-1"
                            : "rounded-full bg-surface-low px-2.5 py-1"
                    }
                >
                    <Text
                        className={
                            backupInfo
                                ? "text-label-sm font-semibold text-primary"
                                : "text-label-sm text-text-secondary"
                        }
                    >
                        {loading
                            ? "Checking…"
                            : backupInfo
                              ? "Backup active"
                              : "Not backed up"}
                    </Text>
                </View>
            </View>

            {backupInfo?.updatedAt && (
                <Text className="text-label-sm text-text-secondary">
                    Last updated {formatPostDate(backupInfo.updatedAt)}
                </Text>
            )}

            <View className="gap-2.5">
                {!backupInfo ? (
                    <Pressable
                        disabled={loading}
                        onPress={handleOpenSetup}
                        accessibilityRole="button"
                        accessibilityLabel="Set up 12-word recovery phrase"
                        className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5"
                    >
                        <KeyRound size={17} color={colors.buttonGradientText} />
                        <Text className="text-label-md font-semibold text-on-primary">
                            Set Up 12-Word Recovery Phrase
                        </Text>
                    </Pressable>
                ) : (
                    <>
                        <Pressable
                            onPress={() => {
                                setRestoreError(null);
                                setRestoreInput("");
                                setRestoreModalOpen(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Unlock with recovery phrase"
                            className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5"
                        >
                            <Unlock
                                size={17}
                                color={colors.buttonGradientText}
                            />
                            <Text className="text-label-md font-semibold text-on-primary">
                                Unlock with Recovery Phrase
                            </Text>
                        </Pressable>

                        <View className="flex-row gap-2">
                            <Pressable
                                onPress={handleOpenSetup}
                                accessibilityRole="button"
                                accessibilityLabel="Generate new phrase"
                                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-low py-3"
                            >
                                <RefreshCw
                                    size={15}
                                    color={colors.textPrimary}
                                />
                                <Text className="text-label-sm font-semibold text-text-primary">
                                    New Phrase
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={removing}
                                onPress={handleRemoveBackup}
                                accessibilityRole="button"
                                accessibilityLabel="Turn off backup"
                                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-low py-3"
                            >
                                <Trash2 size={15} color={colors.error} />
                                <Text className="text-label-sm font-semibold text-error">
                                    {removing ? "Removing…" : "Turn Off"}
                                </Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </View>

            {/* Remove Backup Confirmation */}
            <Modal
                visible={removeModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!removing) setRemoveModalOpen(false);
                }}
            >
                <View className="flex-1 justify-center bg-black/50 px-4">
                    <View className="rounded-2xl bg-surface-lowest p-5">
                        <Text className="text-title-lg font-semibold text-text-primary">
                            Turn off key backup?
                        </Text>

                        <Text className="mt-1 text-body-sm text-text-secondary">
                            Removing your server backup prevents new devices
                            from restoring with your recovery phrase.
                        </Text>

                        <View className="mt-5 flex-row gap-2">
                            <Pressable
                                disabled={removing}
                                onPress={() => setRemoveModalOpen(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Cancel"
                                className="flex-1 items-center rounded-xl border border-border bg-surface-low py-3"
                            >
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={removing}
                                onPress={confirmRemoveBackup}
                                accessibilityRole="button"
                                accessibilityLabel="Turn off backup"
                                className="flex-1 items-center rounded-xl bg-error py-3"
                            >
                                {removing ? (
                                    <ActivityIndicator
                                        color={colors.buttonGradientText}
                                    />
                                ) : (
                                    <Text className="text-label-md font-semibold text-on-primary">
                                        Turn Off
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Setup Modal */}
            <Modal
                visible={setupModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (confirmedSaved || !generatedPhrase) {
                        setSetupModalOpen(false);
                    }
                }}
            >
                <View className="flex-1 justify-center bg-black/50 px-4">
                    <View className="max-h-[85%] rounded-2xl bg-surface-lowest p-5">
                        <Text className="text-title-lg font-semibold text-text-primary">
                            Save Your 12-Word Recovery Phrase
                        </Text>

                        <Text className="mt-1 text-body-sm text-text-secondary">
                            Write these 12 words down in order. CircleHub never
                            stores this phrase and cannot recover it if lost.
                        </Text>

                        {generating ? (
                            <View className="items-center py-10">
                                <ActivityIndicator color={colors.primary} />
                                <Text className="mt-3 text-body-sm text-text-secondary">
                                    Deriving PBKDF2-SHA256 wrapping key…
                                </Text>
                            </View>
                        ) : (
                            <ScrollView className="mt-4">
                                <View className="flex-row flex-wrap gap-2">
                                    {words.map((word, index) => (
                                        <View
                                            key={`${index + 1}-${word}`}
                                            className="w-[31%] flex-row items-center gap-1.5 rounded-xl border border-border bg-surface-low px-2.5 py-2"
                                        >
                                            <Text className="text-label-sm text-text-secondary">
                                                {index + 1}.
                                            </Text>
                                            <Text className="text-label-sm font-semibold text-text-primary">
                                                {word}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                <Pressable
                                    onPress={handleCopyPhrase}
                                    className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface-low py-2.5"
                                >
                                    {copiedPhrase ? (
                                        <Check size={16} color={colors.primary} />
                                    ) : (
                                        <Copy
                                            size={16}
                                            color={colors.textPrimary}
                                        />
                                    )}
                                    <Text className="text-label-md font-semibold text-text-primary">
                                        {copiedPhrase
                                            ? "Copied to clipboard"
                                            : "Copy 12-Word Phrase"}
                                    </Text>
                                </Pressable>

                                <View className="mt-4 flex-row items-center justify-between gap-3 rounded-xl bg-surface-low p-3">
                                    <Text className="flex-1 text-body-sm text-text-primary">
                                        I have saved my 12-word recovery phrase
                                        in a safe place.
                                    </Text>
                                    <Switch
                                        value={confirmedSaved}
                                        onValueChange={setConfirmedSaved}
                                        trackColor={{
                                            false: colors.textSecondary,
                                            true: colors.primary,
                                        }}
                                        thumbColor={colors.surface}
                                    />
                                </View>

                                <Pressable
                                    disabled={!confirmedSaved}
                                    onPress={() => setSetupModalOpen(false)}
                                    className={
                                        confirmedSaved
                                            ? "mt-4 items-center rounded-xl bg-primary py-3.5"
                                            : "mt-4 items-center rounded-xl bg-surface-highest py-3.5"
                                    }
                                >
                                    <Text
                                        className={
                                            confirmedSaved
                                                ? "text-label-md font-semibold text-on-primary"
                                                : "text-label-md font-semibold text-text-secondary"
                                        }
                                    >
                                        Done
                                    </Text>
                                </Pressable>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Restore Modal */}
            <Modal
                visible={restoreModalOpen || restoreFromPrompt}
                transparent
                animationType="fade"
                onRequestClose={closeRestoreModal}
            >
                <View className="flex-1 justify-center bg-black/50 px-4">
                    <View className="rounded-2xl bg-surface-lowest p-5">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-title-lg font-semibold text-text-primary">
                                Enter Recovery Phrase
                            </Text>
                            <Pressable
                                onPress={closeRestoreModal}
                                hitSlop={8}
                                className="h-8 w-8 items-center justify-center rounded-full bg-surface-low"
                            >
                                <X size={18} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <Text className="mt-1 text-body-sm text-text-secondary">
                            Enter your 12-word recovery phrase separated by
                            spaces to verify and unlock your key backup on this
                            device.
                        </Text>

                        <TextInput
                            value={restoreInput}
                            onChangeText={(val) => {
                                setRestoreInput(val);
                                setRestoreError(null);
                            }}
                            placeholder="word1 word2 word3 … word12"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                            autoCorrect={false}
                            multiline
                            className="mt-4 min-h-[88px] rounded-xl border border-border bg-surface-low p-3 text-body-sm text-text-primary"
                            textAlignVertical="top"
                        />

                        <View className="mt-2 flex-row items-center justify-between">
                            <Text className="text-label-sm text-text-secondary">
                                {typedWords.length} / 12 words
                            </Text>

                            {typedWords.length === 12 && (
                                <Text
                                    className={
                                        checksumOk
                                            ? "text-label-sm font-semibold text-primary"
                                            : "text-label-sm font-semibold text-error"
                                    }
                                >
                                    {checksumOk
                                        ? "Valid BIP39 phrase"
                                        : !wellFormed
                                          ? "Contains unknown BIP39 word"
                                          : "Invalid phrase checksum"}
                                </Text>
                            )}
                        </View>

                        {restoreError && (
                            <Text className="mt-2 text-body-sm text-error">
                                {restoreError}
                            </Text>
                        )}

                        <Pressable
                            disabled={!checksumOk || restoring}
                            onPress={handleRestoreSubmit}
                            className={
                                checksumOk && !restoring
                                    ? "mt-4 items-center rounded-xl bg-primary py-3.5"
                                    : "mt-4 items-center rounded-xl bg-surface-highest py-3.5"
                            }
                        >
                            {restoring ? (
                                <ActivityIndicator
                                    color={colors.buttonGradientText}
                                />
                            ) : (
                                <Text
                                    className={
                                        checksumOk
                                            ? "text-label-md font-semibold text-on-primary"
                                            : "text-label-md font-semibold text-text-secondary"
                                    }
                                >
                                    Unlock Key Backup
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
