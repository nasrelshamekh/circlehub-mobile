import { Hash, Search, X } from "lucide-react-native";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

const SUGGESTED_TAGS = ["#technology", "#announcements", "#design", "#general", "#photos"];

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
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm gap-3">
            <View className="flex-row items-center gap-3">
                <Search size={20} color={colors.textSecondary} />

                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="Search posts, @people, or #tags..."
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

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ alignItems: "center", gap: 6 }}
            >
                <View className="flex-row items-center gap-1 pr-1">
                    <Hash size={13} color={colors.textSecondary} />
                    <Text className="text-label-xs text-text-secondary">Trending:</Text>
                </View>

                {SUGGESTED_TAGS.map((tag) => {
                    const isSelected = value.toLowerCase() === tag.toLowerCase();

                    return (
                        <Pressable
                            key={tag}
                            onPress={() => onChangeText(isSelected ? "" : tag)}
                            accessibilityRole="button"
                            accessibilityLabel={`Search ${tag}`}
                            className={`rounded-full px-3 py-1 ${
                                isSelected ? "bg-primary" : "bg-surface-low active:bg-surface-high"
                            }`}
                        >
                            <Text
                                className={`text-label-xs font-semibold ${
                                    isSelected ? "text-white" : "text-text-secondary"
                                }`}
                            >
                                {tag}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}
