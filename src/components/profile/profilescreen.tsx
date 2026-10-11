import { ScrollView, Text, View } from "react-native";

import ProfileHeader from "@/components/profile/profileheader";
import ProfileInfoPanels from "@/components/profile/profileinfopanel";
import ProfileTabs from "@/components/profile/profiletabs";
import ProfileSkeleton from "@/components/skeletons/profileskeleton";
import { useProfileLikedPosts } from "@/hooks/useProfileLikedPosts";
import { useUserCommunities } from "@/hooks/useUserCommunities";
import { useUserFollowing } from "@/hooks/useUserFollowing";
import { useUserPosts } from "@/hooks/useUserPosts";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function ProfileScreen({ username }: { username: string }) {
    const { user, isLoading: isProfileLoading } = useUserProfile(username);
    const { posts, isLoading: isLoadingPosts } = useUserPosts(username);
    const { likedPosts, isLoading: isLoadingLikedPosts } =
        useProfileLikedPosts(username);
    const { following } = useUserFollowing(username);
    const { communities } = useUserCommunities(username);

    if (isProfileLoading) {
        return <ProfileSkeleton />;
    }

    if (!user) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-title-lg font-semibold text-text-primary">
                    Profile not found
                </Text>
                <Text className="mt-2 text-center text-body-sm text-text-secondary">
                    The profile you are looking for does not exist.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-8"
        >
            <ProfileHeader user={user} />

            <View className="px-4">
                <View className="mt-4 gap-4">
                    <ProfileInfoPanels
                        user={user}
                        connections={following}
                        connectionsTitle={
                            user.isCurrentUser
                                ? "Your Connections"
                                : "Mutual Connections"
                        }
                        communities={communities}
                    />

                    <ProfileTabs
                        user={user}
                        posts={posts}
                        likedPosts={likedPosts}
                        isLoadingPosts={isLoadingPosts}
                        isLoadingLikedPosts={isLoadingLikedPosts}
                    />
                </View>
            </View>
        </ScrollView>
    );
}
