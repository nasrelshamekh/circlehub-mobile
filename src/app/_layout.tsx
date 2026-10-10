import "../global.css";

import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useColorScheme } from "nativewind";

import { AuthProvider, useAuth } from "@/context/authcontext";
import { ThemeProvider } from "@/context/themecontext";
import { themes } from "@/theme/themes";

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </ThemeProvider>
    );
}

function RootNavigator() {
    const { colorScheme } = useColorScheme();
    const { status } = useAuth();

    const theme = colorScheme === "dark" ? themes.dark : themes.light;

    // Hold on a splash view until we know whether the stored token is valid —
    // rendering the Stack first would flash the wrong screen.
    if (status === "loading") {
        return (
            <View
                className="flex-1 items-center justify-center bg-surface-low"
                style={theme}
            >
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1" style={theme}>
            <Stack screenOptions={{ headerShown: false }}>
                {/* Anchor: the landing screen is the first available route, so
                    denied navigation (e.g. a guest hitting /(tabs)) lands here. */}
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />

                <Stack.Protected guard={status === "authenticated"}>
                    <Stack.Screen name="(tabs)" />
                </Stack.Protected>
            </Stack>
        </View>
    );
}
