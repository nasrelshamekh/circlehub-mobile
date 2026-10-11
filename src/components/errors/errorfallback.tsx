import type { ErrorBoundaryProps } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Text, View } from "react-native";

import GradientButton from "@/components/ui/gradientbutton";
import { themeColors } from "@/theme/colors";

export default function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
    const { colorScheme } = useColorScheme();
    const colors = colorScheme === "dark" ? themeColors.dark : themeColors.light;

    return (
        <View className="flex-1 items-center justify-center gap-2 bg-surface-low px-8">
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-error-container">
                <AlertCircle size={30} color={colors.error} />
            </View>

            <Text className="text-center text-headline-md font-semibold text-text-primary">
                Something went wrong
            </Text>

            <Text className="text-center text-body-sm text-text-secondary">
                {error.message || "An unexpected error occurred."}
            </Text>

            <GradientButton
                onPress={retry}
                label="Try again"
                className="mt-4 rounded-xl"
                contentStyle={{ paddingHorizontal: 24, paddingVertical: 14 }}
                textClassName="text-body-md font-semibold"
            />
        </View>
    );
}
