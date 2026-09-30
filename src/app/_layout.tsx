import "../global.css";

import { Stack } from "expo-router";
import { View } from "react-native";
import { useColorScheme } from "nativewind";

import { ThemeProvider } from "@/context/themecontext";
import { themes } from "@/theme/themes";

export default function RootLayout() {
    const { colorScheme } = useColorScheme();

    const theme = colorScheme === "dark" ? themes.dark : themes.light;

    return (
        <ThemeProvider>
            <View className="flex-1" style={theme}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                    }}
                />
            </View>
        </ThemeProvider>
    );
}