import { Activity, Network, Users } from "lucide-react-native";
import { Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

const stats = [
    {
        value: "25+",
        label: "Members in your network",
        icon: Users,
    },
    {
        value: "8",
        label: "Community spaces to explore",
        icon: Network,
    },
    {
        value: "Live",
        label: "Feed actions and updates",
        icon: Activity,
    },
];

export default function LandingStats() {
    const { isDark } = useTheme();

    const colors = isDark
        ? themeColors.dark
        : themeColors.light;

    return (
        <View className="gap-4 p-6">
            {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                    <View
                        key={stat.label}
                        className="items-center rounded-2xl bg-surface-lowest px-4 py-4"
                        style={{
                            borderWidth: 0,
                        }}
                    >
                        <View className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-active">
                            <Icon size={20} color={colors.primary} />
                        </View>

                        <Text className="text-[26px] font-extrabold leading-8 text-text-primary">
                            {stat.value}
                        </Text>

                        <Text className="mt-1 max-w-[220px] text-center text-label-md text-text-secondary">
                            {stat.label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

