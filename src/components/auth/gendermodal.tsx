import { Check } from "lucide-react-native";
import { Modal, Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export const GENDERS = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
];

export function genderLabel(value: string) {
    return (
        GENDERS.find((gender) => gender.value === value)?.label ?? "Select gender"
    );
}

type GenderModalProps = {
    visible: boolean;
    value: string;
    onSelect: (value: string) => void;
    onClose: () => void;
};

export default function GenderModal({
    visible,
    value,
    onSelect,
    onClose,
}: GenderModalProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 justify-center px-6"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
                onPress={onClose}
            >
                <View className="w-full max-w-lg self-center overflow-hidden rounded-2xl bg-surface-lowest py-2">
                    {GENDERS.map((option) => (
                        <Pressable
                            key={option.value}
                            onPress={() => onSelect(option.value)}
                            className="flex-row items-center justify-between px-5 py-4"
                        >
                            <Text className="text-body-md text-text-primary">
                                {option.label}
                            </Text>

                            {value === option.value && (
                                <Check size={18} color={colors.primary} />
                            )}
                        </Pressable>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
}
