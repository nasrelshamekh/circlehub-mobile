import NetInfo from "@react-native-community/netinfo";
import { Wifi, WifiOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useChatConnection } from "@/context/chatconnectioncontext";
import { useTheme } from "@/context/themecontext";

export default function OfflineBanner() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { status } = useChatConnection();
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const online = Boolean(
                state.isConnected && state.isInternetReachable !== false
            );
            setIsOnline(online);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // Disconnected when device has no network, or when SignalR dropped and is reconnecting/offline
    const isDisconnected =
        !isOnline || status === "reconnecting" || status === "offline";

    const [prevDisconnected, setPrevDisconnected] = useState(isDisconnected);
    const [bannerState, setBannerState] = useState<"offline" | "restored" | null>(
        () => (isDisconnected ? "offline" : null)
    );

    if (prevDisconnected !== isDisconnected) {
        setPrevDisconnected(isDisconnected);
        if (isDisconnected) {
            setBannerState("offline");
        } else if (bannerState === "offline") {
            setBannerState("restored");
        }
    }

    const [translateY] = useState(() => new Animated.Value(-40));
    const [opacity] = useState(() => new Animated.Value(0));
    const [pulseAnim] = useState(() => new Animated.Value(0.4));

    // Animate banner entry/exit
    useEffect(() => {
        if (bannerState) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -40,
                    duration: 160,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 160,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [bannerState, opacity, translateY]);

    // Pulsing dot animation while offline
    useEffect(() => {
        if (bannerState === "offline") {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0.4,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
    }, [bannerState, pulseAnim]);

    // Auto-dismiss "Back online"
    useEffect(() => {
        if (bannerState === "restored") {
            const timer = setTimeout(() => {
                setBannerState(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [bannerState]);

    if (!bannerState) {
        return null;
    }

    const isRestored = bannerState === "restored";

    // Palette
    const bgStyle = isRestored
        ? isDark
            ? { backgroundColor: "rgba(16, 185, 129, 0.2)", borderColor: "rgba(16, 185, 129, 0.45)" }
            : { backgroundColor: "rgba(209, 250, 229, 0.95)", borderColor: "rgba(16, 185, 129, 0.4)" }
        : isDark
            ? { backgroundColor: "rgba(245, 158, 11, 0.2)", borderColor: "rgba(245, 158, 11, 0.45)" }
            : { backgroundColor: "rgba(254, 243, 199, 0.95)", borderColor: "rgba(245, 158, 11, 0.4)" };

    const textColor = isRestored
        ? isDark
            ? "#6ee7b7"
            : "#047857"
        : isDark
            ? "#fcd34d"
            : "#b45309";

    const iconColor = isRestored
        ? isDark
            ? "#34d399"
            : "#059669"
        : isDark
            ? "#fbbf24"
            : "#d97706";

    const dotColor = isRestored ? "#10b981" : "#f59e0b";

    return (
        <View
            testID="offline-reconnecting-banner"
            pointerEvents="none"
            style={[
                styles.container,
                { top: insets.top + (Platform.OS === "ios" ? 4 : 8) },
            ]}
        >
            <Animated.View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[
                    styles.pill,
                    bgStyle,
                    {
                        transform: [{ translateY }],
                        opacity,
                    },
                ]}
            >
                {isRestored ? (
                    <>
                        <View style={[styles.dot, { backgroundColor: dotColor }]} />
                        <Wifi size={14} color={iconColor} />
                        <Text style={[styles.text, { color: textColor }]}>
                            Back online
                        </Text>
                    </>
                ) : (
                    <>
                        <Animated.View
                            style={[
                                styles.dot,
                                { backgroundColor: dotColor, opacity: pulseAnim },
                            ]}
                        />
                        <WifiOff size={14} color={iconColor} />
                        <Text style={[styles.text, { color: textColor }]}>
                            You&apos;re offline. Reconnecting...
                        </Text>
                    </>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 9999,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    text: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.2,
    },
});
