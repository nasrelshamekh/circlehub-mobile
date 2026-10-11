import { ArrowRight, Sparkles } from "lucide-react-native";
import { ImageBackground, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import LandingStats from "./landingstats";
import { LinearGradient } from "expo-linear-gradient";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export default function LandingHero() {
    const { isDark } = useTheme();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const overlayColors: readonly [string, string, string] = isDark
        ? [
              "rgba(6, 14, 32, 0.94)",
              "rgba(6, 14, 32, 0.72)",
              "rgba(6, 14, 32, 0.18)",
          ]
        : [
              "rgba(250, 248, 255, 0.96)",
              "rgba(250, 248, 255, 0.82)",
              "rgba(250, 248, 255, 0.22)",
          ];

    const overlayLocations: readonly [number, number, number] = isDark
        ? [0, 0.42, 0.8]
        : [0, 0.4, 0.78];

    return (
        <ImageBackground
            source={require("@/assets/images/hero.png")}
            className="min-h-screen"
            resizeMode="cover"
        >
            <LinearGradient
                colors={overlayColors}
                locations={overlayLocations}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                pointerEvents="none"
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                }}
            />

            <View className="flex-1 px-6 py-4">
                <View className="flex-row items-center justify-between">
                    <ImageBackground
                        source={require("@/assets/images/circlehub-logo.png")}
                        className="h-12 w-40"
                        resizeMode="contain"
                    />

                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={() => router.push("/(auth)/login")}
                            className="rounded-full bg-surface-lowest px-4 py-2"
                        >
                            <Text className="text-body-sm text-text-primary">
                                Sign in
                            </Text>
                        </Pressable>

                        <GradientButton
                            onPress={() => router.push("/(auth)/register")}
                            label="Sign up"
                            className="rounded-xl"
                            contentStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                            textClassName="text-body-sm font-medium"
                        />
                    </View>
                </View>

                <View className="mt-2 flex-1 justify-center">
                    <View className="self-start flex-row items-center gap-2 rounded-full bg-surface-lowest px-4 py-2">
                        <Sparkles size={16} color={colors.primary} />

                        <Text className="text-label-md text-primary">
                            A social hub for builders
                        </Text>
                    </View>

                    <Text className="mt-5 text-[44px] font-extrabold leading-[50px] text-text-primary">
                        Meet people, join communities, keep ideas moving.
                    </Text>

                    <Text className="mt-5 text-body-lg text-text-secondary">
                        CircleHub brings profiles, posts, communities,
                        follows, and notifications into one polished social
                        workspace.
                    </Text>

                    <View className="mt-7 gap-3">
                        <GradientButton
                            onPress={() => router.push("/(auth)/register")}
                            label="Create an account"
                            trailingIcon={
                                <ArrowRight size={18} color={colors.buttonGradientText} />
                            }
                            className="rounded-xl"
                            contentStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
                            textClassName="text-body-md font-semibold"
                        />

                        <Pressable
                            onPress={() => router.push("/(auth)/login")}
                            className="items-center justify-center rounded-xl bg-surface-lowest px-5 py-4"
                        >
                            <Text className="text-body-md font-semibold text-text-primary">
                                I already have an account
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            <LandingStats />
        </ImageBackground>
    );
}