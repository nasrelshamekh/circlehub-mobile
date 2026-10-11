import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import FollowersTabs, {
    FollowersTabValue,
} from "@/components/followers/followerstabs";
import FollowersSkeleton from "@/components/skeletons/followersskeleton";
import { useUserFollowers } from "@/hooks/useUserFollowers";
import { useUserFollowing } from "@/hooks/useUserFollowing";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function FollowersScreen({
    username,
    initialTab = "followers",
}: {
    username: string;
    initialTab?: FollowersTabValue;
}) {
    const [activeTab, setActiveTab] = useState<FollowersTabValue>(initialTab);

    const { user, isLoading: isProfileLoading } = useUserProfile(username);
    const { followers, isLoading: isLoadingFollowers } =
        useUserFollowers(username);
    const { following, isLoading: isLoadingFollowing } =
        useUserFollowing(username);

    const isLoading = isProfileLoading || isLoadingFollowers || isLoadingFollowing;

    if (isLoading) {
        return <FollowersSkeleton />;
    }

    if (!user) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-title-lg font-semibold text-text-primary">
                    Profile not found
                </Text>
                <Text className="mt-2 text-center text-body-sm text-text-secondary">
                    The profile network you are looking for does not exist.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="p-4 pb-8"
            className="flex-1"
        >
            <View className="gap-4">
                <View>
                    <Text className="text-headline-md font-bold text-text-primary">
                        {user.name}
                    </Text>

                    <Text className="mt-1 text-body-sm text-text-secondary">
                        View @{user.username}&apos;s followers and following.
                    </Text>
                </View>

                <FollowersTabs
                    followers={followers}
                    following={following}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </View>
        </ScrollView>
    );
}
