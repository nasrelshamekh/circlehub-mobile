import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

export default function Skeleton({
    className = "",
    style,
}: {
    className?: string;
    style?: StyleProp<ViewStyle>;
}) {
    return <View className={`bg-surface-high ${className}`} style={style} />;
}
