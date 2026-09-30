import { ArrowRight, Sparkles } from "lucide-react-native";
import { router } from "expo-router";
import {
    Image,
    Linking,
    Pressable,
    Text,
    View,
} from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { LinearGradient } from "expo-linear-gradient";

export default function LandingFooter() {
    const { isDark } = useTheme();

    const colors = isDark
        ? themeColors.dark
        : themeColors.light;

    const openPortfolio = () => {
        Linking.openURL("https://portfolio-pearl-seven-23.vercel.app/");
    };

    return (
        <View className="bg-surface-high px-6 py-10 dark:bg-surface-lowest">
            {/* Top hairline */}
            <View className="absolute inset-x-0 top-0 h-px bg-black/10 dark:bg-white/10" />

            {/* CTA */}
            <View>
                <View className="self-start flex-row items-center gap-2 rounded-full bg-surface-lowest/70 px-4 py-2 dark:bg-white/10">
                    <Sparkles size={16} color={colors.primary} />

                    <Text className="text-label-md text-primary dark:text-white/82">
                        Ready when you are
                    </Text>
                </View>

                <Text className="mt-5 text-[34px] font-extrabold leading-10 text-text-primary dark:text-white">
                    Build your community, then make the feed worth coming back
                    to.
                </Text>

                <Text className="mt-5 text-body-md text-text-secondary dark:text-white/70">
                    CircleHub is a social app for profiles, posts, communities,
                    and the small interactions that make a network feel
                    active.
                </Text>

                <View className="mt-7 gap-3">
                    <Pressable
                        onPress={() => router.push("/(auth)/register")}
                        className="rounded-xl overflow-hidden"
                    >
                        <LinearGradient
                            colors={[
                                colors.primaryGradientStart,
                                colors.primaryGradientEnd,
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                paddingHorizontal: 20,
                                paddingVertical: 16,
                            }}
                        >
                            <Text
                                className="text-body-md font-semibold"
                                style={{ color: colors.buttonGradientText }}
                            >
                                Get started now
                            </Text>

                            <ArrowRight size={18} color={colors.buttonGradientText} />
                        </LinearGradient>
                    </Pressable>

                    <Pressable
                        onPress={() => router.push("/(auth)/login")}
                        className="items-center justify-center rounded-xl bg-surface-lowest px-6 py-4 dark:bg-white/10"
                    >
                        <Text className="text-body-md font-semibold text-primary dark:text-white">
                            Sign in
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Footer info */}
            <View className="mt-12 border-t border-black/10 pt-6 dark:border-white/10">
                <Image
                    source={require("@/assets/images/circlehub-logo.png")}
                    className="h-10 w-40"
                    resizeMode="contain"
                />

                <Text className="mt-2 text-label-sm text-text-secondary dark:text-white/58">
                    A focused social space for builders, creators, and
                    communities.
                </Text>

                <Text className="mt-6 text-label-sm text-text-secondary dark:text-white/58">
                    © 2026 CircleHub. All rights reserved. Developed by{" "}
                    <Text
                        className="font-bold text-primary"
                        onPress={openPortfolio}
                    >
                        Nasrdev
                    </Text>
                    .
                </Text>
            </View>
        </View>
    );
}