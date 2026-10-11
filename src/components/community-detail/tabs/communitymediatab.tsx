import { router } from "expo-router";
import { Image as ImageIcon, Lock } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import EmptyState from "@/components/ui/emptystate";
import Skeleton from "@/components/ui/skeleton";
import { getImageUrl } from "@/lib/imageUrl";
import { CommunityDetails } from "@/types/community";
import { Post } from "@/types/post";

type CommunityMediaTabProps = {
    community: CommunityDetails;
    posts: Post[];
    isPrivateLocked: boolean;
    isLoadingPosts: boolean;
};

export default function CommunityMediaTab({
    community,
    posts,
    isPrivateLocked,
    isLoadingPosts,
}: CommunityMediaTabProps) {
    const mediaPosts = posts.filter((post) => post.imageUrl);

    if (isPrivateLocked) {
        return (
            <EmptyState
                icon={Lock}
                title="This community is private"
                subtitle={`Request to join ${community.name} to view its media.`}
            />
        );
    }

    if (isLoadingPosts && mediaPosts.length === 0) {
        return (
            <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <Skeleton className="mb-3 h-5 w-20 rounded-md" />

                <View className="flex-row flex-wrap gap-3">
                    <Skeleton className="aspect-square w-[48%] rounded-lg" />
                    <Skeleton className="aspect-square w-[48%] rounded-lg" />
                </View>
            </View>
        );
    }

    if (mediaPosts.length === 0) {
        return (
            <EmptyState
                icon={ImageIcon}
                title="No media yet"
                subtitle="Photo and image posts will appear here."
            />
        );
    }

    return (
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <Text className="mb-3 text-title-lg font-semibold text-text-primary">
                Media
            </Text>

            <View className="flex-row flex-wrap gap-3">
                {mediaPosts.map((post) => (
                    <Pressable
                        key={post.id}
                        onPress={() => router.push(`/post/${post.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel="Open post"
                        className="w-[48%]"
                    >
                        <Image
                            source={{ uri: getImageUrl(post.imageUrl)! }}
                            className="aspect-square w-full rounded-lg"
                            resizeMode="cover"
                        />
                    </Pressable>
                ))}
            </View>
        </View>
    );
}
