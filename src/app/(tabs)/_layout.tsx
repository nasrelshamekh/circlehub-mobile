import {
    CirclePlus,
    CircleUser,
    Compass,
    Home,
    Users,
} from "lucide-react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    const colors = isDark
        ? themeColors.dark
        : themeColors.light;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textPrimary,

                tabBarStyle: {
                    height: 70 + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: insets.bottom + 8,
                    backgroundColor: colors.surface,
                    borderTopWidth: 0,
                },

                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "500",
                },

                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Home size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="explore"
                options={{
                    title: "Explore",
                    tabBarIcon: ({ color, size }) => (
                        <Compass size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="create"
                options={{
                    title: "Create",
                    tabBarIcon: ({ color, size }) => (
                        <CirclePlus size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="followers"
                options={{
                    title: "Followers",
                    tabBarIcon: ({ color, size }) => (
                        <Users size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <CircleUser size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}