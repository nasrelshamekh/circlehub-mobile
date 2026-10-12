import { router } from "expo-router";
import { Image as ImageIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function CreatePost() {
    const { isDark } = useTheme();
    const { user } = useAuth();

    const colors = isDark ? themeColors.dark : themeColors.light;
    const firstName = user?.name.split(" ")[0];

    return (
        <View className="my-2 rounded-lg bg-surface-lowest p-4">
            <View className="flex-row items-center">
                <Avatar
                    src={user?.avatarUrl}
                    name={user?.name ?? ""}
                    className="mr-3 h-11 w-11"
                />

                <Pressable
                    onPress={() => router.push("/compose")}
                    className="flex-1 rounded-full bg-surface-low px-4 py-3"
                >
                    <Text className="text-body-sm text-text-secondary">
                        {firstName
                            ? `What's on your mind, ${firstName}?`
                            : "What's on your mind?"}
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => router.push("/compose")}
                    className="ml-3 items-center justify-center"
                >
                    <ImageIcon size={22} color={colors.textPrimary} />
                </Pressable>
            </View>
        </View>
    );
}
