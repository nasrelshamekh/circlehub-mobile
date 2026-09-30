import { Image as ImageIcon } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function CreatePost() {
    const { isDark } = useTheme();

    const colors = isDark
        ? themeColors.dark
        : themeColors.light;

    return (
        <View className="my-2 rounded-lg bg-surface-lowest p-4">
            {/* Avatar + input */}
            <View className="flex-row items-center">
                {/* Avatar */}
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-surface-highest">
                    <Image
                        source={require("@/assets/images/avatar.jpg")}
                        className="h-11 w-11 rounded-full"
                    />
                </View>

                {/* Post input */}
                <Pressable className="flex-1 rounded-full bg-surface-low px-4 py-3">
                    <Text className="text-body-sm text-text-secondary">
                        {"What's on your mind?"}
                    </Text>
                </Pressable>

                {/* Add photo */}
                <Pressable className="ml-3 items-center justify-center">
                    <ImageIcon size={22} color={colors.primary} />
                </Pressable>
            </View>
        </View>
    );
}