import { UserCheck, Users } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import FollowUserCard from "@/components/followers/followusercard";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { FollowUser } from "@/types/user";

export type FollowersTabValue = "followers" | "following";

const TABS = [
    { value: "followers", label: "Followers", icon: Users },
    { value: "following", label: "Following", icon: UserCheck },
] as const;

export default function FollowersTabs({
    followers,
    following,
    activeTab,
    onTabChange,
}: {
    followers: FollowUser[];
    following: FollowUser[];
    activeTab: FollowersTabValue;
    onTabChange: (tab: FollowersTabValue) => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const list = activeTab === "followers" ? followers : following;
    const isFollowers = activeTab === "followers";

    return (
        <View className="gap-4">
            <View className="flex-row rounded-2xl bg-surface-low p-1">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.value === activeTab;
                    const count =
                        tab.value === "followers"
                            ? followers.length
                            : following.length;

                    return (
                        <Pressable
                            key={tab.value}
                            onPress={() => onTabChange(tab.value)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                            className={
                                isActive
                                    ? "flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-surface-lowest py-2.5"
                                    : "flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5"
                            }
                        >
                            <Icon
                                size={16}
                                color={
                                    isActive
                                        ? colors.primary
                                        : colors.textSecondary
                                }
                            />
                            <Text
                                className={
                                    isActive
                                        ? "text-label-md font-semibold text-primary"
                                        : "text-label-md text-text-secondary"
                                }
                            >
                                {tab.label} ({count})
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {list.length > 0 ? (
                <View className="gap-3">
                    {list.map((user) => (
                        <FollowUserCard key={user.id} user={user} />
                    ))}
                </View>
            ) : (
                <View className="items-center rounded-2xl bg-surface-lowest px-4 py-10">
                    <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-active">
                        {isFollowers ? (
                            <Users size={24} color={colors.primary} />
                        ) : (
                            <UserCheck size={24} color={colors.primary} />
                        )}
                    </View>

                    <Text className="text-title-lg font-semibold text-text-primary">
                        {isFollowers ? "No followers yet" : "No following yet"}
                    </Text>

                    <Text className="mt-2 text-center text-body-sm text-text-secondary">
                        {isFollowers
                            ? "People will appear here when this profile has followers."
                            : "People will appear here when this profile follows someone."}
                    </Text>
                </View>
            )}
        </View>
    );
}
