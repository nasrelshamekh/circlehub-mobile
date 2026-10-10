import "../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useColorScheme } from "nativewind";

import { AuthProvider, useAuth } from "@/context/authcontext";
import { ThemeProvider } from "@/context/themecontext";
import { queryClient } from "@/lib/queryClient";
import { themes } from "@/theme/themes";

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <RootNavigator />
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
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
                    {/* Post details: pushed as a regular card over the tabs from
                        any post's comment button. */}
                    <Stack.Screen name="post/[id]" />
                    {/* The post composer is presented as a bottom sheet so it
                        slides up from the bottom on open and slides back down
                        on dismiss (Cancel / back button / swipe). A plain
                        `modal` skips its exit animation on some platforms,
                        which reads as a flash. */}
                    <Stack.Screen
                        name="compose"
                        options={{
                            presentation: "formSheet",
                            sheetAllowedDetents: [1],
                            sheetInitialDetentIndex: 0,
                            sheetGrabberVisible: true,
                        }}
                    />
                </Stack.Protected>
            </Stack>
        </View>
    );
}
