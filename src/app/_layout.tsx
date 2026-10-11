import "../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import {
    DarkTheme,
    DefaultTheme,
    Stack,
    ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import type { ErrorBoundaryProps } from "expo-router";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import { useColorScheme } from "nativewind";

import ErrorFallback from "@/components/errors/errorfallback";
import { AuthProvider, useAuth } from "@/context/authcontext";
import { ThemeProvider } from "@/context/themecontext";
import { queryClient } from "@/lib/queryClient";
import { themes } from "@/theme/themes";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    return <ErrorFallback error={error} retry={retry} />;
}

// Keeps the tab bar and headers mounted when a screen throws.
export const unstable_settings = {
    screenErrorBoundary: ErrorFallback,
};

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
    const isDark = colorScheme === "dark";
    // --surface-low: the background the feed/post-detail screens actually paint.
    const stackBackground = isDark ? "#131b2e" : "#f2f3ff";

    // Paint the layer behind every screen so it doesn't flash white on pop.
    const navTheme = useMemo(
        () => ({
            ...(isDark ? DarkTheme : DefaultTheme),
            colors: {
                ...(isDark ? DarkTheme : DefaultTheme).colors,
                background: stackBackground,
            },
        }),
        [isDark, stackBackground],
    );

    // Root window layer; shows during pop gaps and behind the Android nav bar.
    useEffect(() => {
        SystemUI.setBackgroundColorAsync(stackBackground).catch(() => {});
    }, [stackBackground]);

    // Wait for the token check; rendering Stack first flashes the wrong screen.
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
            <NavigationThemeProvider value={navTheme}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: stackBackground },
                    }}
                >
                {/* Anchor for denied navigations, e.g. a guest hitting /(tabs). */}
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />

                <Stack.Protected guard={status === "authenticated"}>
                    <Stack.Screen name="(tabs)" />
                    {/* formSheet gives an exit animation; a plain modal flashes. */}
                    <Stack.Screen
                        name="compose"
                        options={{
                            presentation: "formSheet",
                            sheetAllowedDetents: [1],
                            sheetInitialDetentIndex: 0,
                            sheetGrabberVisible: true,
                        }}
                    />
                    <Stack.Screen
                        name="create-community"
                        options={{
                            presentation: "formSheet",
                            sheetAllowedDetents: [1],
                            sheetInitialDetentIndex: 0,
                            sheetGrabberVisible: true,
                        }}
                    />
                </Stack.Protected>
                </Stack>
            </NavigationThemeProvider>
        </View>
    );
}
