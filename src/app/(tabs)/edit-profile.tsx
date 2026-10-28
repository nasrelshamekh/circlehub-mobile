import { router, useFocusEffect } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EditProfileScreen from "@/components/profile/editprofilescreen";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function EditProfileRoute() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const goBack = useCallback(() => {
        router.replace("/(tabs)/profile");
    }, []);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                goBack();
                return true;
            };
            const sub = BackHandler.addEventListener(
                "hardwareBackPress",
                onBackPress
            );
            return () => sub.remove();
        }, [goBack])
    );

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
                    Edit Profile
                </Text>
            </View>

            <EditProfileScreen />
        </SafeAreaView>
    );
}
