import {
    Heart,
    MessageCircle,
    MoreHorizontal,
    Send,
} from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { Post } from "@/types/post";
import { getImageUrl } from "@/lib/imageUrl";
import { formatPostDate } from "@/lib/formatPostDate";

export default function PostCard({ post }: { post: Post }) {
    const { isDark } = useTheme();

    const colors = isDark
        ? themeColors.dark
        : themeColors.light;

    const isLiked = post.isLikedByMe;

    return (
        <View
            className="my-2 rounded-lg bg-surface-lowest p-5"
            style={{ gap: 16 }}
        >
            {/* Post Header */}
            <View className="flex-row items-start justify-between">
                <View className="flex-row items-center gap-3">
                    {post.author.avatarUrl ? (
                        <Image
                            source={{ uri: post.author.avatarUrl }}
                            className="h-11 w-11 rounded-full"
                        />
                    ) : (
                        <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-highest">
                            <Text className="text-label-md text-text-secondary">
                                {post.author.name.charAt(0)}
                            </Text>
                        </View>
                    )}

                    <View>
                        <Text className="text-label-md font-semibold text-text-primary">
                            {post.author.name}
                        </Text>

                        <Text className="text-body-sm text-text-secondary">
                            {formatPostDate(post.createdAt)}
                        </Text>
                    </View>
                </View>

                <Pressable className="h-10 w-10 items-center justify-center rounded-full">
                    <MoreHorizontal
                        size={18}
                        color={colors.textSecondary}
                    />
                </Pressable>
            </View>

            {/* Post Content */}
            {post.content && (
                <View>
                    <Text className="text-body-md text-text-secondary">
                        {post.content}
                    </Text>
                </View>
            )}

            {/* Post Image */}
            {post.imageUrl && (
                <Image
                    source={{ uri: getImageUrl(post.imageUrl)! }}
                    className="w-full rounded-2xl"
                    style={{ height: 200 }}
                    resizeMode="cover"
                />
            )}

            {/* Post Actions */}
            <View className="flex-row items-center gap-2 pt-3">
                <Pressable className="flex-row items-center gap-2 rounded-full px-4 py-3">
                    <Heart
                        size={20}
                        color={isLiked ? colors.primary : colors.textSecondary}
                        fill={isLiked ? colors.primary : "transparent"}
                    />

                    <Text
                        className={
                            isLiked
                                ? "text-body-sm font-semibold text-primary"
                                : "text-body-sm text-text-secondary"
                        }
                    >
                        {post.likesCount}
                    </Text>
                </Pressable>

                <Pressable className="flex-row items-center gap-2 rounded-full px-4 py-3">
                    <MessageCircle
                        size={20}
                        color={colors.textSecondary}
                    />

                    <Text className="text-body-sm text-text-secondary">
                        {post.commentsCount}
                    </Text>
                </Pressable>

                <Pressable className="flex-row items-center gap-2 rounded-full px-4 py-3">
                    <Send
                        size={20}
                        color={colors.textSecondary}
                    />
                </Pressable>
            </View>
        </View>
    );
}