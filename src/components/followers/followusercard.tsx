import { router } from "expo-router";
import { MapPin, Users } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import FollowButton from "@/components/followers/followbutton";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { FollowUser } from "@/types/user";

export default function FollowUserCard({ user }: { user: FollowUser }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm gap-3">
            <View className="flex-row items-start justify-between gap-3">
                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: "/profile/[username]",
                            params: { username: user.username },
                        })
                    }
                    className="flex-1 flex-row items-start gap-3"
                >
                    <Avatar
                        src={user.avatarUrl}
                        name={user.name}
                        className="h-14 w-14"
                    />

                    <View className="flex-1">
                        <Text
                            numberOfLines={1}
                            className="text-body-md font-semibold text-text-primary"
                        >
                            {user.name}
                        </Text>

                        {user.jobTitle ? (
                            <Text
                                numberOfLines={1}
                                className="text-label-sm font-medium text-primary"
                            >
                                {user.jobTitle}
                            </Text>
                        ) : null}

                        <Text
                            numberOfLines={1}
                            className="text-label-sm text-text-secondary"
                        >
                            @{user.username}
                        </Text>
                    </View>
                </Pressable>

                <FollowButton user={user} />
            </View>

            {user.bio ? (
                <Text
                    numberOfLines={2}
                    className="text-body-sm text-text-secondary"
                >
                    {user.bio}
                </Text>
            ) : null}

            <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
                {user.location ? (
                    <View className="flex-row items-center gap-1.5">
                        <MapPin size={15} color={colors.textSecondary} />
                        <Text className="text-label-sm text-text-secondary">
                            {user.location}
                        </Text>
                    </View>
                ) : null}

                <View className="flex-row items-center gap-1.5">
                    <Users size={15} color={colors.textSecondary} />
                    <Text className="text-label-sm text-text-secondary">
                        {user.followersCount.toLocaleString()} followers
                    </Text>
                </View>
            </View>
        </View>
    );
}
