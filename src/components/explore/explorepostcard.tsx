import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import PostActions from "@/components/postactions";
import { formatPostDate } from "@/lib/formatPostDate";
import { getImageUrl } from "@/lib/imageUrl";
import { Post } from "@/types/post";

export default function ExplorePostCard({ post }: { post: Post }) {
    const imageUri = getImageUrl(post.imageUrl);

    function openPost() {
        router.push(`/post/${post.id}`);
    }

    function openAuthorProfile() {
        router.push({
            pathname: "/profile/[username]",
            params: { username: post.author.username },
        });
    }

    return (
        <View className="my-2 overflow-hidden rounded-lg bg-surface-lowest">
            {imageUri ? (
                <Pressable
                    onPress={openPost}
                    accessibilityRole="button"
                    accessibilityLabel="Open post"
                >
                    <Image
                        source={{ uri: imageUri }}
                        className="h-40 w-full"
                        resizeMode="cover"
                    />
                </Pressable>
            ) : null}

            <View className="p-5 gap-4">
                <Pressable
                    onPress={openAuthorProfile}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${post.author.name}'s profile`}
                    className="flex-row items-start gap-3"
                >
                    <Avatar
                        src={post.author.avatarUrl}
                        name={post.author.name}
                        className="h-11 w-11"
                    />

                    <View className="min-w-0 flex-1">
                        <Text
                            numberOfLines={1}
                            className="text-body-md font-semibold text-text-primary"
                        >
                            {post.author.name}
                        </Text>

                        <Text
                            numberOfLines={1}
                            className="text-label-sm text-text-secondary"
                        >
                            @{post.author.username}
                            {post.author.jobTitle
                                ? ` • ${post.author.jobTitle}`
                                : ""}
                        </Text>
                    </View>
                </Pressable>

                {post.content ? (
                    <Pressable
                        onPress={openPost}
                        accessibilityRole="button"
                        accessibilityLabel="Open post"
                    >
                        <Text
                            numberOfLines={3}
                            className="text-body-sm text-text-secondary"
                        >
                            {post.content}
                        </Text>
                    </Pressable>
                ) : null}

                <View className="flex-row items-center justify-between gap-3 border-t border-border pt-3">
                    <Text className="text-label-sm text-text-secondary">
                        {formatPostDate(post.createdAt)}
                    </Text>

                    <View className="flex-row items-center">
                        <PostActions post={post} variant="compact" />
                    </View>
                </View>
            </View>
        </View>
    );
}
