import { View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function PresenceDot({ isOnline }: { isOnline?: boolean }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const onlineColor = colors.success;
    const offlineColor = isDark ? "#464554" : "#9ca3af";

    return (
        <View
            accessibilityLabel={isOnline ? "Online" : "Offline"}
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface-lowest"
            style={{
                backgroundColor: isOnline ? onlineColor : offlineColor,
            }}
        />
    );
}
