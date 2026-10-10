import { ScrollView, Text, View } from "react-native";

import Header from "@/components/header";
import ProfileHeader from "@/components/profile/profileheader";
import ProfileInfoPanels from "@/components/profile/profileinfopanel";
import ProfileSkeleton from "@/components/profile/profileskeleton";
import ProfileTabs from "@/components/profile/profiletabs";
import { useAuth } from "@/context/authcontext";
import { useProfileLikedPosts } from "@/hooks/useProfileLikedPosts";
import { useUserCommunities } from "@/hooks/useUserCommunities";
import { useUserFollowing } from "@/hooks/useUserFollowing";
import { useUserPosts } from "@/hooks/useUserPosts";
import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Profile tab — composes the profile header, info panels and tabs, mirroring
 * the web app's Profile page. The info panels render above the tabs, matching
 * the web layout on narrow screens.
 */
export default function Profile() {
    const { user: authUser } = useAuth();
    const username = authUser?.username ?? "";

    const { user, isLoading: isProfileLoading } = useUserProfile(username);
    const { posts, isLoading: isLoadingPosts } = useUserPosts(username);
    const { likedPosts, isLoading: isLoadingLikedPosts } =
        useProfileLikedPosts(username);
    const { following } = useUserFollowing(username);
    const { communities } = useUserCommunities(username);

    if (isProfileLoading) {
        return (
            <View className="flex-1 bg-surface-low">
                <Header />
                <ProfileSkeleton />
            </View>
        );
    }

    if (!user) {
        return (
            <View className="flex-1 bg-surface-low">
                <Header />
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-title-lg font-semibold text-text-primary">
                        Profile not found
                    </Text>
                    <Text className="mt-2 text-center text-body-sm text-text-secondary">
                        The profile you are looking for does not exist.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface-low">
            <Header />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
            >
                <ProfileHeader user={user} />

                <View className="px-4">
                    <View className="mt-4" style={{ gap: 16 }}>
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
        </View>
    );
}