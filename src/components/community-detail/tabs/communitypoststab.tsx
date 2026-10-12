import { router } from "expo-router";
import { FileText, Image as ImageIcon, Lock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import PostCard from "@/components/postcard";
import PostCardSkeleton from "@/components/skeletons/postcardskeleton";
import EmptyState from "@/components/ui/emptystate";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { CommunityDetails } from "@/types/community";
import { Post } from "@/types/post";

type CommunityPostsTabProps = {
    community: CommunityDetails;
    posts: Post[];
    canCreatePost: boolean;
    canManagePosts: boolean;
    isPrivateLocked: boolean;
    isLoadingPosts: boolean;
};

export default function CommunityPostsTab({
    community,
    posts,
    canCreatePost,
    canManagePosts,
    isPrivateLocked,
    isLoadingPosts,
}: CommunityPostsTabProps) {
    const { user } = useAuth();
    const { isDark } = useTheme();

    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="gap-3">
            {canCreatePost ? (
                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: "/compose",
                            params: {
                                communityId: community.id,
                                communityName: community.name,
                            },
                        })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Create a post in ${community.name}`}
                    className="flex-row items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm"
                >
                    <Avatar
                        src={user?.avatarUrl}
                        name={user?.name ?? ""}
                        className="h-11 w-11"
                    />

                    <Text
                        numberOfLines={1}
                        className="flex-1 text-body-sm text-text-secondary"
                    >
                        Share something with {community.name}...
                    </Text>

                    <ImageIcon size={22} color={colors.textPrimary} />
                </Pressable>
            ) : null}

            {isPrivateLocked ? (
                <EmptyState
                    icon={Lock}
                    title="This community is private"
                    subtitle={`Request to join ${community.name} to view its posts.`}
                />
            ) : isLoadingPosts && posts.length === 0 ? (
                <View className="gap-3">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                </View>
            ) : posts.length > 0 ? (
                posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        community={{
                            id: community.id,
                            slug: community.slug,
                        }}
                        canDelete={canManagePosts}
                    />
                ))
            ) : (
                <EmptyState
                    icon={FileText}
                    title="No posts yet"
                    subtitle="Community posts will appear here."
                />
            )}
        </View>
    );
}
