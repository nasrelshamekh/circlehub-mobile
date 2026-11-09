import { ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { themes } from "@/theme/themes";

export type ConfirmModalProps = {
    visible: boolean;
    title: string;
    message?: string;
    cancelText?: string;
    confirmText?: string;
    destructive?: boolean;
    loading?: boolean;
    showCancel?: boolean;
    icon?: ReactNode;
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
    showCancel = true,
    icon,
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
                    {icon && <View className="mb-3 items-center">{icon}</View>}

                    <Text className="text-title-lg font-semibold text-text-primary">
                        {title}
                    </Text>

                    {message ? (
                        <Text className="mt-1.5 text-body-sm text-text-secondary leading-relaxed">
                            {message}
                        </Text>
                    ) : null}

                    <View className="mt-5 flex-row gap-2.5">
                        {showCancel && (
                            <Pressable
                                disabled={loading}
                                onPress={onCancel}
                                accessibilityRole="button"
                                accessibilityLabel={cancelText}
                                className="flex-1 items-center rounded-xl border border-border bg-surface-low py-3 active:bg-surface-high"
                                style={{ borderRadius: 24 }}
                            >
                                <Text className="text-label-md font-semibold text-text-primary">
                                    {cancelText}
                                </Text>
                            </Pressable>
                        )}

                        {destructive ? (
                            <Pressable
                                disabled={loading}
                                onPress={onConfirm}
                                accessibilityRole="button"
                                accessibilityLabel={confirmText}
                                className={`${
                                    showCancel ? "flex-1" : "w-full"
                                } items-center justify-center rounded-xl bg-error py-3 active:opacity-90`}
                                style={{ borderRadius: 24 }}
                            >
                                {loading ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#ffffff"
                                    />
                                ) : (
                                    <Text className="text-label-md font-semibold text-white">
                                        {confirmText}
                                    </Text>
                                )}
                            </Pressable>
                        ) : (
                            <GradientButton
                                disabled={loading}
                                onPress={onConfirm}
                                accessibilityLabel={confirmText}
                                label={loading ? undefined : confirmText}
                                icon={
                                    loading ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={colors.buttonGradientText}
                                        />
                                    ) : undefined
                                }
                                className={`${showCancel ? "flex-1" : "w-full"} rounded-xl`}
                                contentStyle={{ paddingVertical: 12, borderRadius: 24 }}
                                textClassName="text-label-md font-semibold"
                            />
                        )}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
