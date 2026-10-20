import { WifiOff } from "lucide-react-native";
import { Text, View } from "react-native";

import { useChatConnection } from "@/context/chatconnectioncontext";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function ChatConnectionStatus() {
    const { status } = useChatConnection();
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    if (status !== "reconnecting" && status !== "offline") {
        return null;
    }

    const label =
        status === "reconnecting" ? "Reconnecting…" : "Live updates paused";

    return (
        <View className="flex-row items-center gap-1.5 rounded-full bg-surface-highest px-2.5 py-1">
            <WifiOff size={12} color={colors.textSecondary} />
            <Text className="text-label-sm font-medium text-text-secondary">
                {label}
            </Text>
        </View>
    );
}
