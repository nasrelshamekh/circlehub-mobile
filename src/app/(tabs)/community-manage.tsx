import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ManageCommunityScreen from "@/components/community-detail/manage/managecommunityscreen";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function CommunityManageRoute() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const { isDark } = useTheme();

    const colors = isDark ? themeColors.dark : themeColors.light;

    function goBack() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)/communities");
        }
    }

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
                    Manage Community
                </Text>
            </View>

            {slug ? <ManageCommunityScreen slug={slug} /> : null}
        </SafeAreaView>
    );
}
