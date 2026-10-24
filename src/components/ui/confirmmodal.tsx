import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { themes } from "@/theme/themes";

type ConfirmModalProps = {
    visible: boolean;
    title: string;
    message?: string;
    cancelText?: string;
    confirmText?: string;
    destructive?: boolean;
    loading?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export default function ConfirmModal({
    visible,
    title,
    message,
    cancelText = "Cancel",
    confirmText = "Confirm",
    destructive = false,
    loading = false,
    onCancel,
    onConfirm,
}: ConfirmModalProps) {
    const { isDark } = useTheme();
    const theme = isDark ? themes.dark : themes.light;
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                if (!loading) onCancel();
            }}
        >
            <Pressable
                className="flex-1 justify-center bg-black/50 px-6"
                style={theme}
                onPress={() => {
                    if (!loading) onCancel();
                }}
            >
                <Pressable
                    onPress={(e) => e.stopPropagation?.()}
                    className="w-full max-w-sm self-center overflow-hidden rounded-2xl bg-surface-lowest p-5 shadow-xl"
                >
                    <Text className="text-title-lg font-semibold text-text-primary">
                        {title}
                    </Text>

                    {message ? (
                        <Text className="mt-1.5 text-body-sm text-text-secondary">
                            {message}
                        </Text>
                    ) : null}

                    <View className="mt-5 flex-row gap-2.5">
                        <Pressable
                            disabled={loading}
                            onPress={onCancel}
                            accessibilityRole="button"
                            accessibilityLabel={cancelText}
                            className="flex-1 items-center rounded-xl border border-border bg-surface-low py-3 active:bg-surface-high"
                        >
                            <Text className="text-label-md font-semibold text-text-primary">
                                {cancelText}
                            </Text>
                        </Pressable>

                        <Pressable
                            disabled={loading}
                            onPress={onConfirm}
                            accessibilityRole="button"
                            accessibilityLabel={confirmText}
                            className={`flex-1 items-center justify-center rounded-xl py-3 active:opacity-90 ${
                                destructive ? "bg-error" : "bg-primary"
                            }`}
                        >
                            {loading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.buttonGradientText}
                                />
                            ) : (
                                <Text className="text-label-md font-semibold text-on-primary">
                                    {confirmText}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
