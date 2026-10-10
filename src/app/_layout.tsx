import "../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import {
    DarkTheme,
    DefaultTheme,
    Stack,
    ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
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
    const isDark = colorScheme === "dark";
    // --surface-low: the background the feed/post-detail screens actually paint.
    const stackBackground = isDark ? "#131b2e" : "#f2f3ff";

    // Navigation theme: paint the stack container (the layer behind every
    // screen) with the app's surface color instead of the default near-white.
    // That layer peeks through for a frame when a screen pops (e.g. post
    // details back to the feed) while the underlying screen is being
    // re-attached and re-rendered.
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

    // Paint the app's root view (the window layer beneath the whole
    // navigation stack). On Android, when a pushed screen pops (e.g. post
    // details back to the feed), the underlying screen's native view can be
    // momentarily blank while it re-attaches — that gap shows this window
    // layer, whose default color is white. Painting it with the app's surface
    // color makes that gap blend with the screens instead. (This layer also
    // shows through the transparent system navigation bar at the bottom of
    // edge-to-edge Android, so it doubles as the strip behind the back/home
    // buttons.)
    useEffect(() => {
        SystemUI.setBackgroundColorAsync(stackBackground).catch(() => {});
    }, [stackBackground]);

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
            <NavigationThemeProvider value={navTheme}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: stackBackground },
                    }}
                >
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
            </NavigationThemeProvider>
        </View>
    );
}
