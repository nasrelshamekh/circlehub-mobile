import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    StatusBar,
    View,
} from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { themes } from "@/theme/themes";

export default function AppLoadingScreen() {
    const { isDark } = useTheme();
    const theme = isDark ? themes.dark : themes.light;
    const colors = isDark ? themeColors.dark : themeColors.light;

    const [pulseAnim] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    const scale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1.03],
    });

    const opacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 1.0],
    });

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

            <View className="items-center justify-center gap-6">
                <Animated.View
                    style={{
                        transform: [{ scale }],
                        opacity,
                    }}
                >
                    <Image
                        source={require("@/assets/images/circlehub-logo.png")}
                        className="h-14 w-48"
                        resizeMode="contain"
                    />
                </Animated.View>

                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        </View>
    );
}
