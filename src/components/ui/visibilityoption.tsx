import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

import type { LucideIcon } from "lucide-react-native";

export default function VisibilityOption({
    icon: Icon,
    label,
    description,
    selected,
    onPress,
}: {
    icon: LucideIcon;
    label: string;
    description: string;
    selected: boolean;
    onPress: () => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            className={
                selected
                    ? "flex-1 rounded-xl border border-transparent bg-active p-3"
                    : "flex-1 rounded-xl border border-border bg-surface-lowest p-3"
            }
        >
            <View className="flex-row items-center gap-1.5">
                <Icon
                    size={14}
                    color={selected ? colors.primary : colors.textSecondary}
                />

                <Text
                    className={
                        selected
                            ? "text-label-md font-semibold text-primary"
                            : "text-label-md font-semibold text-text-primary"
                    }
                >
                    {label}
                </Text>
            </View>

            <Text className="mt-1 text-label-sm text-text-secondary">
                {description}
            </Text>
        </Pressable>
    );
}
