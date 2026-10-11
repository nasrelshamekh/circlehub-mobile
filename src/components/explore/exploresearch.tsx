import { Search, X } from "lucide-react-native";
import { Pressable, TextInput, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function ExploreSearch({
    value,
    onChangeText,
}: {
    value: string;
    onChangeText: (text: string) => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <View className="flex-row items-center gap-3">
                <Search size={20} color={colors.textSecondary} />

                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="Search posts, people, or communities..."
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    className="flex-1 rounded-xl bg-surface-low px-4 py-3 text-body-sm text-text-primary"
                />

                {value ? (
                    <Pressable
                        onPress={() => onChangeText("")}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        hitSlop={6}
                        className="h-8 w-8 items-center justify-center rounded-full bg-active"
                    >
                        <X size={16} color={colors.primary} />
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}
