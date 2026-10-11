import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useColorScheme } from "nativewind";

import { themeColors } from "@/theme/colors";

type GradientButtonProps = {
    onPress?: () => void;
    label?: string;
    icon?: ReactNode;
    trailingIcon?: ReactNode;
    disabled?: boolean;
    className?: string;
    contentStyle?: StyleProp<ViewStyle>;
    textClassName?: string;
    accessibilityLabel?: string;
};

export default function GradientButton({
    onPress,
    label,
    icon,
    trailingIcon,
    disabled = false,
    className = "rounded-xl",
    contentStyle,
    textClassName = "text-body-sm font-semibold",
    accessibilityLabel,
}: GradientButtonProps) {
    const { colorScheme } = useColorScheme();
    const colors = colorScheme === "dark" ? themeColors.dark : themeColors.light;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            className={`overflow-hidden ${className}`}
            style={disabled ? { opacity: 0.6 } : undefined}
        >
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    {
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                    },
                    contentStyle,
                ]}
            >
                {icon}

                {label ? (
                    <Text
                        className={textClassName}
                        style={{ color: colors.buttonGradientText }}
                    >
                        {label}
                    </Text>
                ) : null}

                {trailingIcon}
            </LinearGradient>
        </Pressable>
    );
}
