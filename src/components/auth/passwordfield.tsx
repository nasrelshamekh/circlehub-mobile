import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

type PasswordFieldProps = TextInputProps & {
    label?: string;
    error?: string;
};

export default function PasswordField({
    label = "Password",
    error,
    ...inputProps
}: PasswordFieldProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const [visible, setVisible] = useState(false);

    return (
        <View className="gap-3">
            <Text className="text-label-md font-semibold text-text-primary">
                {label}
            </Text>

            <View
                className={
                    error
                        ? "flex-row items-center rounded-xl border border-error bg-surface-lowest px-4"
                        : "flex-row items-center rounded-xl border border-border bg-surface-lowest px-4"
                }
            >
                <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    {...inputProps}
                    secureTextEntry={!visible}
                    placeholderTextColor={colors.textSecondary}
                    className="min-w-0 flex-1 py-3 text-body-sm text-text-primary"
                />

                <Pressable
                    onPress={() => setVisible((current) => !current)}
                    className="ml-3 shrink-0"
                    accessibilityRole="button"
                    accessibilityLabel={visible ? "Hide password" : "Show password"}
                >
                    {visible ? (
                        <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                        <Eye size={18} color={colors.textSecondary} />
                    )}
                </Pressable>
            </View>

            {error ? (
                <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                    {error}
                </Text>
            ) : null}
        </View>
    );
}
