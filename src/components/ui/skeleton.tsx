import { useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useWindowDimensions, View } from "react-native";

import { SkeletonShimmer } from "@/components/ui/motion";
import { useTheme } from "@/context/themecontext";

export default function Skeleton({
    className = "",
    style,
}: {
    className?: string;
    style?: StyleProp<ViewStyle>;
}) {
    const { isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();

    // A neutral wash: light enough to read as a highlight over the skeleton's own
    // surface tone, and deliberately not a theme token — it is an overlay on a
    // placeholder, not a surface in its own right.
    const shimmerColor = isDark
        ? "rgba(218, 226, 253, 0.08)"
        : "rgba(19, 27, 46, 0.05)";

    // The bar sweeps a range wider than its own box, so it enters and leaves instead
    // of appearing to fade in place.
    const barWidth = useMemo(
        () => Math.max(screenWidth * 0.5, 240),
        [screenWidth]
    );

    return (
        <View
            className={`relative overflow-hidden bg-surface-high ${className}`}
            style={style}
        >
            <SkeletonShimmer
                width={barWidth}
                color={shimmerColor}
                className="absolute inset-y-0"
            />
        </View>
    );
}
