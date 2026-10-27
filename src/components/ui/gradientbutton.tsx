import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme } from "@/context/themecontext";
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
    className = "",
    contentStyle,
    textClassName = "text-body-sm font-semibold",
    accessibilityLabel,
}: GradientButtonProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    // `className` is a layout override (flex-1, w-full, mt-4…). Keep the app's
    // 12px button radius unless the caller explicitly asks for a different one,
    // so a layout-only class can never flatten the button into a rectangle.
    const radiusClass = /(^|\s)rounded-/.test(className) ? "" : "rounded-xl";

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            className={`overflow-hidden ${radiusClass} ${className}`.replace(/\s+/g, " ").trim()}
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
