import { Compass, Network, Sparkles, Users } from "lucide-react-native";
import { Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

const features = [
    {
        title: "Build your community",
        description:
            "Follow people, discover shared connections, and keep your profile useful.",
        icon: Users,
    },
    {
        title: "Join focused communities",
        description:
            "Find spaces around design, development, products, and creative work.",
        icon: Network,
    },
    {
        title: "Explore without friction",
        description:
            "Search posts, people, and communities from one clean discovery view.",
        icon: Compass,
    },
];

export default function LandingFeatures() {
    const { isDark } = useTheme();

    const colors = isDark
        ? themeColors.dark
        : themeColors.light;

    return (
        <View className="bg-surface-low px-6 py-16">
            {/* Section heading */}
            <View className="items-center">
                <View className="flex-row items-center gap-2 rounded-full bg-active px-4 py-2">
                    <Sparkles size={16} color={colors.primary} />

                    <Text className="text-label-md text-primary">
                        What CircleHub helps you do
                    </Text>
                </View>

                <Text className="mt-4 text-center text-headline-md font-bold text-text-primary">
                    Three loops that make the app feel alive.
                </Text>

                <Text className="mt-3 text-center text-body-md text-text-secondary">
                    Join the ultimate experience.
                </Text>
            </View>

            {/* Feature cards */}
            <View className="mt-10 gap-5">
                {features.map((feature) => {
                    const Icon = feature.icon;

                    return (
                        <View
                            key={feature.title}
                            className="items-center rounded-xl bg-surface-lowest px-6 py-8"
                        >
                            <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-active">
                                <Icon size={28} color={colors.primary} />
                            </View>

                            <Text className="text-center text-title-lg font-semibold text-text-primary">
                                {feature.title}
                            </Text>

                            <Text className="mt-3 max-w-[288px] text-center text-body-sm text-text-secondary">
                                {feature.description}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}