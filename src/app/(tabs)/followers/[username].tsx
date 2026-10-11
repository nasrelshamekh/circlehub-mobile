import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FollowersScreen from "@/components/followers/followersscreen";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function FollowersByUsernameScreen() {
    const { username, tab } = useLocalSearchParams<{
        username: string;
        tab?: string;
    }>();
    const { isDark } = useTheme();

    const colors = isDark ? themeColors.dark : themeColors.light;

    function goBack() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    const initialTab = tab === "following" ? "following" : "followers";

    return (
        <SafeAreaView className="flex-1 bg-surface-low" edges={["top"]}>
            <View className="flex-row items-center gap-2 px-2 py-2">
                <Pressable
                    onPress={goBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full"
                >
                    <ChevronLeft size={24} color={colors.textPrimary} />
                </Pressable>

                <Text
                    numberOfLines={1}
                    className="flex-1 text-title-lg font-semibold text-text-primary"
                >
                    Network
                </Text>
            </View>

            <FollowersScreen
                key={initialTab}
                username={username}
                initialTab={initialTab}
            />
        </SafeAreaView>
    );
}
