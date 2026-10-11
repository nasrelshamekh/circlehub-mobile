import { Bell, MessageCircle, Moon, Network } from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const { signOut, user } = useAuth();

    const colors = isDark ? themeColors.dark : themeColors.light;

    async function handleSignOut() {
        setMenuOpen(false);
        await signOut();
        router.replace("/(auth)/login");
    }

    return (
        <SafeAreaView edges={["top"]} className="bg-background">
            <View className="relative z-50">
                <View className="h-20 flex-row items-center justify-between px-6">
                    <Image
                        source={require("@/assets/images/circlehub-logo.png")}
                        className="h-12 w-[145px]"
                        resizeMode="contain"
                    />

                    <View className="flex-row items-center gap-3">
                        <Pressable className="items-center justify-center">
                            <MessageCircle size={22} color={colors.textPrimary} />
                        </Pressable>

                        <Pressable className="items-center justify-center">
                            <Bell size={22} color={colors.textPrimary} />
                        </Pressable>

                        <Pressable
                            onPress={() => router.push("/communities")}
                            accessibilityRole="button"
                            accessibilityLabel="Communities"
                            className="items-center justify-center"
                        >
                            <Network size={22} color={colors.textPrimary} />
                        </Pressable>

                        <Pressable
                            onPress={() => setMenuOpen((prev) => !prev)}
                            className="items-center justify-center"
                        >
                            <Avatar
                                src={user?.avatarUrl}
                                name={user?.name ?? ""}
                                className="h-10 w-10"
                            />
                        </Pressable>
                    </View>
                </View>
            </View>

            <Modal
                visible={menuOpen}
                transparent
                animationType="none"
                onRequestClose={() => setMenuOpen(false)}
            >
                <View className="flex-1">
                    <Pressable
                        className="absolute inset-0"
                        onPress={() => setMenuOpen(false)}
                    />

                    <View className="absolute right-4 top-[62px] w-[200px] rounded-lg bg-surface-lowest py-1 shadow-lg">
                        <Text className="px-4 pb-1 pt-3 text-body-md font-bold text-text-secondary">
                            My Account
                        </Text>

                        <Pressable
                            onPress={() => {
                                setMenuOpen(false);
                                router.navigate("/profile");
                            }}
                            className="px-4 py-3.5"
                        >
                            <Text className="text-label-md text-text-primary">
                                Profile
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                setMenuOpen(false);
                                router.navigate({
                                    pathname: "/edit-profile",
                                    params: { tab: "profile" },
                                });
                            }}
                            className="px-4 py-3.5"
                        >
                            <Text className="text-label-md text-text-primary">
                                Settings
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                toggleTheme();
                                setMenuOpen(false);
                            }}
                            className="flex-row items-center justify-between px-4 py-3.5"
                        >
                            <Text className="text-label-md text-text-primary">
                                {isDark ? "Light mode" : "Dark mode"}
                            </Text>

                            <Moon size={18} color={colors.textPrimary} />
                        </Pressable>

                        <Pressable onPress={handleSignOut} className="px-4 py-3.5">
                            <Text className="text-label-md text-text-primary">
                                Sign Out
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
