import { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themes } from "@/theme/themes";

export type ActionOption = {
    key: string;
    label: string;
    icon?: ReactNode;
    destructive?: boolean;
    onPress: () => void;
};

type ActionModalProps = {
    visible: boolean;
    title?: string;
    options: ActionOption[];
    onClose: () => void;
};

export default function ActionModal({
    visible,
    title,
    options,
    onClose,
}: ActionModalProps) {
    const { isDark } = useTheme();
    const theme = isDark ? themes.dark : themes.light;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 justify-center bg-black/50 px-6"
                style={theme}
                onPress={onClose}
            >
                <Pressable
                    onPress={(e) => e.stopPropagation?.()}
                    className="w-full max-w-sm self-center overflow-hidden rounded-2xl bg-surface-lowest p-4 shadow-xl"
                >
                    {title ? (
                        <Text className="mb-2 px-3 pt-1 text-label-md font-bold text-text-secondary">
                            {title}
                        </Text>
                    ) : null}

                    <View className="gap-1">
                        {options.map((option) => (
                            <Pressable
                                key={option.key}
                                onPress={() => {
                                    onClose();
                                    option.onPress();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={option.label}
                                className="flex-row items-center gap-3.5 rounded-xl px-3.5 py-3.5 active:bg-surface-low"
                            >
                                {option.icon}

                                <Text
                                    className={`text-body-md font-medium ${
                                        option.destructive
                                            ? "text-error"
                                            : "text-text-primary"
                                    }`}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel"
                        className="mt-3 w-full items-center rounded-xl border border-border bg-surface-low py-3 active:bg-surface-high"
                    >
                        <Text className="text-label-md font-semibold text-text-primary">
                            Cancel
                        </Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
