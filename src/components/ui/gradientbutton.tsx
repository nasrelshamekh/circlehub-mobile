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

    // `className` is a layout override (flex-1, w-full, mt-4…). Match the web app's
    // default button radius (--radius-xl: 1.5rem = 24px) unless the caller
    // explicitly asks for a different one (e.g. rounded-full, rounded-lg, etc.).
    const isPill = /(^|\s)rounded-full(\s|$)/.test(className);
    const radiusClass = /(^|\s)rounded-/.test(className) ? "" : "rounded-xl";
    let numericRadius = isPill ? 9999 : 24;
    if (!isPill) {
        if (/(^|\s)rounded-lg(\s|$)/.test(className)) {
            numericRadius = 16;
        } else if (/(^|\s)rounded-md(\s|$)/.test(className)) {
            numericRadius = 12;
        } else if (/(^|\s)rounded-base(\s|$)/.test(className)) {
            numericRadius = 8;
        } else if (/(^|\s)rounded-sm(\s|$)/.test(className)) {
            numericRadius = 4;
        }
    }

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            className={`overflow-hidden ${radiusClass} ${className}`.replace(/\s+/g, " ").trim()}
            style={[
                { borderRadius: numericRadius },
                disabled ? { opacity: 0.6 } : undefined,
            ]}
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
                        borderRadius: numericRadius,
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
