import {
    Bell,
    MessageCircle,
    Moon,
    Network,
} from "lucide-react-native";
import { useState } from "react";
import {
    Image,
    Modal,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const { signOut } = useAuth();

    const colors = isDark
        ? themeColors.dark
        : themeColors.light;

    async function handleSignOut() {
        setMenuOpen(false);
        await signOut();
    }

    return (
        <SafeAreaView
            edges={["top"]}
            className="bg-background"
        >
            {/* Header */}
            <View className="relative z-50">
                <View className="h-20 flex-row items-center justify-between px-6">
                    {/* CircleHub Logo */}
                    <Image
                        source={require("@/assets/images/circlehub-logo.png")}
                        className="h-12 w-[145px]"
                        resizeMode="contain"
                    />

                    {/* Right side */}
                    <View className="flex-row items-center gap-3">
                        {/* Messages */}
                        <Pressable className="items-center justify-center">
                            <MessageCircle
                                size={22}
                                color={colors.textPrimary}
                            />
                        </Pressable>

                        {/* Notifications */}
                        <Pressable className="items-center justify-center">
                            <Bell
                                size={22}
                                color={colors.textPrimary}
                            />
                        </Pressable>

                        {/* Communities */}
                        <Pressable className="items-center justify-center">
                            <Network
                                size={22}
                                color={colors.textPrimary}
                            />
                        </Pressable>

                        {/* Avatar */}
                        <Pressable
                            onPress={() => setMenuOpen((prev) => !prev)}
                            className="items-center justify-center"
                        >
                            <Image
                                source={require("@/assets/images/avatar.jpg")}
                                className="h-10 w-10 rounded-full"
                                resizeMode="cover"
                            />
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Dropdown */}
            <Modal
                visible={menuOpen}
                transparent
                animationType="none"
                onRequestClose={() => setMenuOpen(false)}
            >
                <View className="flex-1">
                    {/* Outside touch area */}
                    <Pressable
                        className="absolute inset-0"
                        onPress={() => setMenuOpen(false)}
                    />

                    {/* Dropdown */}
                    <View className="absolute right-4 top-[62px] w-[200px] rounded-lg bg-surface-lowest py-1 shadow-lg">
                        <Text className="px-4 pb-1 pt-3 text-label-md font-semibold text-text-secondary">
                            My Account
                        </Text>

                        {/* Profile */}
                        <Pressable
                            onPress={() => setMenuOpen(false)}
                            className="px-4 py-3.5"
                        >
                            <Text className="text-body-md text-text-primary">
                                Profile
                            </Text>
                        </Pressable>

                        {/* Settings */}
                        <Pressable
                            onPress={() => setMenuOpen(false)}
                            className="px-4 py-3.5"
                        >
                            <Text className="text-body-md text-text-primary">
                                Settings
                            </Text>
                        </Pressable>

                        {/* Theme */}
                        <Pressable
                            onPress={() => {
                                toggleTheme();
                                setMenuOpen(false);
                            }}
                            className="flex-row items-center justify-between px-4 py-3.5"
                        >
                            <Text className="text-body-md text-text-primary">
                                {isDark ? "Light mode" : "Dark mode"}
                            </Text>

                            <Moon
                                size={18}
                                color={colors.textPrimary}
                            />
                        </Pressable>

                        {/* Logout */}
                        <Pressable
                            onPress={handleSignOut}
                            className="px-4 py-3.5"
                        >
                            <Text className="text-body-md text-text-primary">
                                Sign Out
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}