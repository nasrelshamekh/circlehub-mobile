import { router, usePathname } from "expo-router";
import {
    Bell,
    CircleUser,
    Compass,
    Home,
    LogOut,
    MessageCircle,
    Moon,
    Network,
    Settings,
    Sun,
    Users,
    X,
} from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
    Animated,
    BackHandler,
    Dimensions,
    Image,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import { useAuth } from "@/context/authcontext";
import {
    SidebarDrawerContext,
    SidebarDrawerContextType,
} from "@/context/sidebardrawercontext";
import { useTheme } from "@/context/themecontext";
import { useConversations } from "@/hooks/useConversations";
import { useNotifications } from "@/hooks/useNotifications";
import { themeColors } from "@/theme/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.min(295, Math.round(SCREEN_WIDTH * 0.78));

export default function SidebarDrawer({ children }: { children: ReactNode }) {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const { isDark, toggleTheme } = useTheme();
    const { user, signOut } = useAuth();
    const { conversations } = useConversations();
    const { unreadCount: unreadNotifications } = useNotifications();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const unreadMessages = useMemo(
        () =>
            conversations.reduce(
                (total, conversation) => total + conversation.unreadCount,
                0
            ),
        [conversations]
    );

    const [isOpen, setIsOpen] = useState(false);

    const [translateX] = useState(() => new Animated.Value(-DRAWER_WIDTH));
    const [backdropOpacity] = useState(() => new Animated.Value(0));

    const openSidebar = useCallback(() => {
        setIsOpen(true);
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0,
                speed: 18,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start();
    }, [translateX, backdropOpacity]);

    const closeSidebar = useCallback(() => {
        Animated.parallel([
            Animated.timing(translateX, {
                toValue: -DRAWER_WIDTH,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsOpen(false);
        });
    }, [translateX, backdropOpacity]);

    // Hardware back press closes drawer if open
    useEffect(() => {
        if (!isOpen) return undefined;
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            closeSidebar();
            return true;
        });
        return () => sub.remove();
    }, [isOpen, closeSidebar]);

    // Swiping left-to-right gesture to open drawer from the left side of screen
    const openPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponderCapture: () => false,
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponderCapture: () => false,
                onMoveShouldSetPanResponder: (_, gestureState) => {
                    if (isOpen) return false;
                    return (
                        gestureState.x0 <= 80 &&
                        gestureState.dx > 15 &&
                        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4
                    );
                },
                onPanResponderRelease: (_, gestureState) => {
                    if (gestureState.dx > 30 || gestureState.vx > 0.3) {
                        openSidebar();
                    }
                },
            }),
        [isOpen, openSidebar]
    );

    // Dedicated left-edge touch strip for effortless edge swiping
    const edgeStripPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, gestureState) => {
                    if (isOpen) return false;
                    return (
                        gestureState.dx > 10 &&
                        Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
                    );
                },
                onPanResponderRelease: (_, gestureState) => {
                    if (gestureState.dx > 20 || gestureState.vx > 0.3) {
                        openSidebar();
                    }
                },
            }),
        [isOpen, openSidebar]
    );

    // Swiping right-to-left to close drawer when open
    const closePanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, gestureState) => {
                    return (
                        gestureState.dx < -10 &&
                        Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
                    );
                },
                onPanResponderMove: (_, gestureState) => {
                    if (gestureState.dx < 0) {
                        translateX.setValue(Math.max(-DRAWER_WIDTH, gestureState.dx));
                        const progress = 1 + gestureState.dx / DRAWER_WIDTH;
                        backdropOpacity.setValue(Math.max(0, Math.min(1, progress)));
                    }
                },
                onPanResponderRelease: (_, gestureState) => {
                    if (gestureState.dx < -40 || gestureState.vx < -0.3) {
                        closeSidebar();
                    } else {
                        Animated.parallel([
                            Animated.spring(translateX, {
                                toValue: 0,
                                useNativeDriver: true,
                                bounciness: 0,
                            }),
                            Animated.timing(backdropOpacity, {
                                toValue: 1,
                                duration: 150,
                                useNativeDriver: true,
                            }),
                        ]).start();
                    }
                },
            }),
        [closeSidebar, translateX, backdropOpacity]
    );

    function handleNavigate(route: string) {
        if (isOpen) {
            closeSidebar();
        }
        router.push(route as any);
    }

    async function handleSignOut() {
        closeSidebar();
        await signOut();
        router.replace("/(auth)/login");
    }

    const navItems = [
        {
            label: "Home",
            route: "/(tabs)",
            icon: Home,
            isActive: pathname === "/" || pathname === "/(tabs)" || pathname === "/index",
        },
        {
            label: "Profile",
            route: user?.username ? `/profile/${user.username}` : "/(tabs)/profile",
            icon: CircleUser,
            isActive: pathname.includes("/profile"),
        },
        {
            label: "Explore",
            route: "/(tabs)/explore",
            icon: Compass,
            isActive: pathname.includes("/explore"),
        },
        {
            label: "Followers",
            route: user?.username ? `/followers/${user.username}` : "/(tabs)/followers",
            icon: Users,
            isActive: pathname.includes("/followers"),
        },
        {
            label: "Communities",
            route: "/(tabs)/communities",
            icon: Network,
            isActive: pathname.includes("/communities") || pathname.includes("/community"),
        },
        {
            label: "Messages",
            route: "/messages",
            icon: MessageCircle,
            badge: unreadMessages,
            isActive: pathname.includes("/messages"),
        },
        {
            label: "Notifications",
            route: "/notifications",
            icon: Bell,
            badge: unreadNotifications,
            isActive: pathname.includes("/notifications"),
        },
        {
            label: "Settings",
            route: "/(tabs)/edit-profile",
            icon: Settings,
            isActive: pathname.includes("/edit-profile"),
        },
    ];

    const contextValue = useMemo<SidebarDrawerContextType>(
        () => ({
            isOpen,
            openSidebar,
            closeSidebar,
        }),
        [isOpen, openSidebar, closeSidebar]
    );

    return (
        <SidebarDrawerContext.Provider value={contextValue}>
            <View className="flex-1" {...openPanResponder.panHandlers}>
                {children}

                {/* Left-edge touch strip for easy edge swipe detection */}
                {!isOpen && (
                    <View
                        {...edgeStripPanResponder.panHandlers}
                        style={{
                            position: "absolute",
                            left: 0,
                            top: insets.top,
                            bottom: insets.bottom,
                            width: 24,
                            zIndex: 40,
                        }}
                    />
                )}

                {/* Left-to-Right Animated Modal Drawer */}
                {isOpen && (
                    <View
                        style={{
                            position: "absolute",
                            top: insets.top,
                            bottom: insets.bottom,
                            left: 0,
                            right: 0,
                        }}
                        className="z-50 flex-row"
                    >
                        {/* Dimmed Backdrop */}
                        <Animated.View
                            style={[
                                StyleSheet.absoluteFill,
                                {
                                    opacity: backdropOpacity.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, 0.55],
                                    }),
                                    backgroundColor: "#000",
                                },
                            ]}
                        >
                            <Pressable
                                onPress={closeSidebar}
                                style={StyleSheet.absoluteFill}
                                accessibilityRole="button"
                                accessibilityLabel="Close sidebar"
                            />
                        </Animated.View>

                        {/* Drawer Panel: Sized to content */}
                        <Animated.View
                            {...closePanResponder.panHandlers}
                            style={[
                                {
                                    width: DRAWER_WIDTH,
                                    transform: [{ translateX }],
                                    elevation: 20,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 4, height: 0 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 16,
                                    paddingBottom: insets.bottom,
                                },
                            ]}
                            className="h-full bg-surface-lowest"
                        >
                            {/* Drawer Header (Similar to create post modal) */}
                            <View className="flex-row items-center justify-between px-5 py-3.5">
                                <Image
                                    source={require("@/assets/images/circlehub-logo.png")}
                                    className="h-8 w-[110px]"
                                    resizeMode="contain"
                                />

                                <Pressable
                                    onPress={closeSidebar}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close sidebar"
                                    hitSlop={8}
                                    className="h-8 w-8 items-center justify-center rounded-full bg-surface-low active:bg-surface-high"
                                >
                                    <X size={16} color={colors.textPrimary} />
                                </Pressable>
                            </View>

                            {/* User Profile Card */}
                            {user && (
                                <Pressable
                                    onPress={() =>
                                        handleNavigate(
                                            user.username
                                                ? `/profile/${user.username}`
                                                : "/(tabs)/profile"
                                        )
                                    }
                                    className="mx-3 mt-3 flex-row items-center gap-3 rounded-2xl bg-surface-low p-3 active:bg-surface-high/40"
                                >
                                    <Avatar
                                        src={user.avatarUrl}
                                        name={user.name}
                                        className="h-10 w-10"
                                    />
                                    <View className="flex-1 min-w-0">
                                        <Text
                                            numberOfLines={1}
                                            className="text-label-md font-semibold text-text-primary"
                                        >
                                            {user.name}
                                        </Text>
                                        <Text
                                            numberOfLines={1}
                                            className="text-label-sm text-text-secondary"
                                        >
                                            @{user.username}
                                        </Text>
                                    </View>
                                </Pressable>
                            )}

                            {/* Web App Left Sidebar Links */}
                            <ScrollView
                                className="flex-1 px-3 py-2"
                                showsVerticalScrollIndicator={false}
                            >
                                <View className="gap-1 py-1">
                                    {navItems.map((item) => (
                                        <Pressable
                                            key={item.label}
                                            onPress={() => handleNavigate(item.route)}
                                            accessibilityRole="button"
                                            accessibilityLabel={
                                                item.badge && item.badge > 0
                                                    ? `${item.label}, ${item.badge} unread`
                                                    : item.label
                                            }
                                            className={`flex-row items-center gap-3.5 rounded-xl px-3.5 py-3 ${
                                                item.isActive
                                                    ? "bg-active"
                                                    : "active:bg-surface-low"
                                            }`}
                                        >
                                            <View className="relative shrink-0 items-center justify-center">
                                                <item.icon
                                                    size={20}
                                                    color={
                                                        item.isActive
                                                            ? colors.primary
                                                            : colors.textPrimary
                                                    }
                                                />

                                                {item.badge != null && item.badge > 0 && (
                                                    <View className="absolute -right-2 -top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1">
                                                        <Text className="text-[10px] font-semibold leading-none text-on-primary">
                                                            {item.badge > 99
                                                                ? "99+"
                                                                : item.badge}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <Text
                                                className={`text-label-md ${
                                                    item.isActive
                                                        ? "font-semibold text-primary"
                                                        : "font-medium text-text-primary"
                                                }`}
                                            >
                                                {item.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* Footer: Theme Toggle & Sign Out */}
                            <View className="px-3 py-2.5 gap-1">
                                <Pressable
                                    onPress={toggleTheme}
                                    accessibilityRole="button"
                                    accessibilityLabel="Toggle theme"
                                    className="flex-row items-center gap-3.5 rounded-xl px-3.5 py-2.5 active:bg-surface-low"
                                >
                                    {isDark ? (
                                        <Sun size={19} color={colors.textPrimary} />
                                    ) : (
                                        <Moon size={19} color={colors.textPrimary} />
                                    )}
                                    <Text className="text-label-md font-medium text-text-primary">
                                        {isDark ? "Light Mode" : "Dark Mode"}
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleSignOut}
                                    accessibilityRole="button"
                                    accessibilityLabel="Sign out"
                                    className="flex-row items-center gap-3.5 rounded-xl px-3.5 py-2.5 active:bg-surface-low"
                                >
                                    <LogOut size={19} color={colors.error} />
                                    <Text className="text-label-md font-medium text-error">
                                        Sign Out
                                    </Text>
                                </Pressable>
                            </View>
                        </Animated.View>
                    </View>
                )}
            </View>
        </SidebarDrawerContext.Provider>
    );
}
