import { Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

type TextFieldProps = TextInputProps & {
    label: string;
    error?: string;
    hint?: string;
};

export default function TextField({
    label,
    error,
    hint,
    ...inputProps
}: TextFieldProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="gap-3">
            <Text className="text-label-md font-semibold text-text-primary">
                {label}
            </Text>

            <TextInput
                {...inputProps}
                placeholderTextColor={colors.textSecondary}
                className={
                    error
                        ? "rounded-xl border border-error bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                        : "rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                }
            />

            {!!error && (
                <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                    {error}
                </Text>
            )}

            {!!hint && (
                <Text className="text-label-sm text-text-secondary">{hint}</Text>
            )}
        </View>
    );
}
