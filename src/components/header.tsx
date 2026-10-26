import { Bell, MessageCircle, Moon, Network } from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import { useConversations } from "@/hooks/useConversations";
import { useNotifications } from "@/hooks/useNotifications";
import { themeColors } from "@/theme/colors";
import { useSidebarDrawer } from "@/context/sidebardrawercontext";

export default function Header() {
    const insets = useSafeAreaInsets();
    const { openSidebar } = useSidebarDrawer();
    const [menuOpen, setMenuOpen] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const { signOut, user } = useAuth();
    const { conversations } = useConversations();
    const { unreadCount: unreadNotifications } = useNotifications();

    const unreadCount = conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0
    );

    const colors = isDark ? themeColors.dark : themeColors.light;

    async function handleSignOut() {
        setMenuOpen(false);
        await signOut();
        router.replace("/(auth)/login");
    }

    return (
        <SafeAreaView edges={["top"]} className="bg-background">
            <View className="relative z-50">
                <View className="h-16 flex-row items-center justify-between px-4">
                    <Pressable
                        onPress={openSidebar}
                        accessibilityRole="button"
                        accessibilityLabel="Open sidebar menu"
                        hitSlop={16}
                    >
                        <Image
                            source={require("@/assets/images/circlehub-logo.png")}
                            className="h-12 w-[145px]"
                            resizeMode="contain"
                        />
                    </Pressable>

                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={() => router.push("/messages")}
                            accessibilityRole="button"
                            accessibilityLabel={
                                unreadCount > 0
                                    ? `Messages, ${unreadCount} unread`
                                    : "Messages"
                            }
                            hitSlop={12}
                            className="relative h-11 w-11 items-center justify-center rounded-full active:bg-surface-high/30"
                        >
                            <MessageCircle size={22} color={colors.textPrimary} />

                            {unreadCount > 0 && (
                                <View className="absolute -right-0.5 -top-0.5 min-w-5 items-center justify-center rounded-full bg-primary px-1 py-0.5">
                                    <Text className="text-label-sm font-semibold text-on-primary">
                                        {unreadCount}
                                    </Text>
                                </View>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={() => router.push("/notifications")}
                            accessibilityRole="button"
                            accessibilityLabel={
                                unreadNotifications > 0
                                    ? `Notifications, ${unreadNotifications} unread`
                                    : "Notifications"
                            }
                            hitSlop={12}
                            className="relative h-11 w-11 items-center justify-center rounded-full active:bg-surface-high/30"
                        >
                            <Bell size={22} color={colors.textPrimary} />

                            {unreadNotifications > 0 && (
                                <View className="absolute -right-0.5 -top-0.5 min-w-5 items-center justify-center rounded-full bg-primary px-1 py-0.5">
                                    <Text className="text-label-sm font-semibold text-on-primary">
                                        {unreadNotifications}
                                    </Text>
                                </View>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={() => router.push("/communities")}
                            accessibilityRole="button"
                            accessibilityLabel="Communities"
                            hitSlop={12}
                            className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-high/30"
                        >
                            <Network size={22} color={colors.textPrimary} />
                        </Pressable>

                        <Pressable
                            onPress={() => setMenuOpen((prev) => !prev)}
                            accessibilityRole="button"
                            accessibilityLabel="Open user menu"
                            hitSlop={12}
                            className="ml-0.5 h-11 w-11 items-center justify-center rounded-full"
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

                    <View
                        style={{ top: insets.top + 68 }}
                        className="absolute right-4 w-[200px] rounded-lg border border-border/50 bg-surface-lowest py-1 shadow-lg"
                    >
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
