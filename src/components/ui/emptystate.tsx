import { Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

import type { LucideIcon } from "lucide-react-native";

export default function EmptyState({
    icon: Icon,
    title,
    subtitle,
}: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="items-center rounded-2xl bg-surface-lowest px-6 py-10">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-active">
                <Icon size={24} color={colors.primary} />
            </View>

            <Text className="text-title-lg font-semibold text-text-primary">
                {title}
            </Text>

            <Text className="mt-2 max-w-sm text-center text-body-sm text-text-secondary">
                {subtitle}
            </Text>
        </View>
    );
}
