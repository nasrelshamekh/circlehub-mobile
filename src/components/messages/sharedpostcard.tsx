import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

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
            <View className="mt-2 rounded-xl bg-surface-lowest px-3 py-2">
                <Text className="text-body-sm text-text-secondary">
                    This post is no longer available.
                </Text>
            </View>
        );
    }

    const imageUri = getImageUrl(post.imageUrl);

    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/post/[id]",
                    params: { id: post.id },
                })
            }
            accessibilityRole="button"
            accessibilityLabel="Open shared post"
            className="mt-2 overflow-hidden rounded-xl bg-surface-lowest"
        >
            <View className="flex-row items-center gap-2 px-3 py-2">
                <Avatar
                    src={post.author.avatarUrl}
                    name={post.author.name}
                    className="h-7 w-7"
                    textClassName="text-label-sm"
                />

                <View className="flex-1">
                    <Text
                        numberOfLines={1}
                        className="text-label-sm font-semibold text-text-primary"
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
                <Image
                    source={{ uri: imageUri }}
                    className="h-[200px] w-full"
                    resizeMode="cover"
                />
            )}
        </Pressable>
    );
}
