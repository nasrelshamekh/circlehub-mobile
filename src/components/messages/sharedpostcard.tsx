import { router } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import { getImageUrl } from "@/lib/imageUrl";
import { Post } from "@/types/post";

export default function SharedPostCard({
    post,
}: {
    post: Post | null | undefined;
}) {
    if (!post) {
        return (
            <View className="mt-2 rounded-xl border border-border bg-surface-lowest px-3 py-2">
                <Text className="text-body-sm text-text-secondary">
                    This post is no longer available.
                </Text>
            </View>
        );
    }

    const imageUri = getImageUrl(post.imageUrl);

    function openPost() {
        if (!post) return;
        router.push({
            pathname: "/post/[id]",
            params: { id: post.id },
        });
    }

    return (
        <Pressable
            onPress={openPost}
            accessibilityRole="button"
            accessibilityLabel={`View shared post by ${post.author.name}`}
            className="mt-2 overflow-hidden rounded-xl border border-border bg-surface-lowest"
        >
            <View className="flex-row items-center gap-2.5 p-3">
                <Avatar
                    src={post.author.avatarUrl}
                    name={post.author.name}
                    className="h-8 w-8"
                    textClassName="text-label-sm"
                />

                <View className="flex-1">
                    <Text
                        numberOfLines={1}
                        className="text-label-md font-semibold text-text-primary"
                    >
                        {post.author.name}
                    </Text>

                    <Text
                        numberOfLines={1}
                        className="text-label-sm text-text-secondary"
                    >
                        @{post.author.username}
                    </Text>
                </View>
            </View>

            {post.content ? (
                <Text
                    numberOfLines={3}
                    className="px-3 pb-2 text-body-sm text-text-secondary"
                >
                    {post.content}
                </Text>
            ) : null}

            {imageUri && (
                <ExpoImage
                    source={{ uri: imageUri }}
                    className="h-[200px] w-full"
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                />
            )}
        </Pressable>
    );
}
