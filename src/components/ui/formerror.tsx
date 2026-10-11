import { AlertCircle } from "lucide-react-native";
import { Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function FormError({ message }: { message: string }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="flex-row items-center gap-1.5 rounded-xl bg-error-container px-4 py-3">
            <AlertCircle size={16} color={colors.error} />

            <Text className="flex-1 text-label-sm text-error">{message}</Text>
        </View>
    );
}
