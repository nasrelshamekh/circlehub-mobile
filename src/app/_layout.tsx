import "../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import {
    DarkTheme,
    DefaultTheme,
    Stack,
    ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import type { ErrorBoundaryProps } from "expo-router";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Platform, StatusBar, View } from "react-native";

import ErrorFallback from "@/components/errors/errorfallback";
import { AuthProvider, useAuth } from "@/context/authcontext";
import { ChatConnectionProvider } from "@/context/chatconnectioncontext";
import { ThemeProvider, useTheme } from "@/context/themecontext";
import { queryClient } from "@/lib/queryClient";
import { themes } from "@/theme/themes";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    return <ErrorFallback error={error} retry={retry} />;
}

export const unstable_settings = {
    screenErrorBoundary: ErrorFallback,
};

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <ChatConnectionProvider>
                        <RootNavigator />
                    </ChatConnectionProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

function RootNavigator() {
    const { isDark } = useTheme();
    const { status } = useAuth();

    const theme = isDark ? themes.dark : themes.light;
    const stackBackground = isDark ? "#131b2e" : "#f2f3ff";

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

    useEffect(() => {
        SystemUI.setBackgroundColorAsync(stackBackground).catch(() => {});
        if (Platform.OS === "android") {
            StatusBar.setTranslucent(true);
            StatusBar.setBackgroundColor("transparent");
            StatusBar.setBarStyle(isDark ? "light-content" : "dark-content");
            try {
                (NavigationBar as any).setStyle?.(isDark ? "light" : "dark");
                (NavigationBar as any).setBackgroundColorAsync?.(stackBackground).catch(() => {});
            } catch {}
        }
    }, [isDark, stackBackground]);

    if (status === "loading") {
        return (
            <View
                className="flex-1 items-center justify-center bg-surface-low"
                style={theme}
            >
                <StatusBar
                    barStyle={isDark ? "light-content" : "dark-content"}
                    backgroundColor="transparent"
                    translucent
                />
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1" style={theme}>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor="transparent"
                translucent
            />
            <NavigationThemeProvider value={navTheme}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: stackBackground },
                    }}
                >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />

                <Stack.Protected guard={status === "authenticated"}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                        name="compose"
                        options={{
                            presentation: "transparentModal",
                            animation: "none",
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
