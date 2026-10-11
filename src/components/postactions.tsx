import { router } from "expo-router";
import { Heart, MessageCircle, Send } from "lucide-react-native";
import { Pressable, Text } from "react-native";

import { useTheme } from "@/context/themecontext";
import useToggleLike from "@/hooks/mutations/useToggleLike";
import { themeColors } from "@/theme/colors";
import { Post } from "@/types/post";

type PostActionsProps = {
    post: Post;

    // "compact" matches the denser explore card; "default" the feed/detail card.
    variant?: "default" | "compact";

    // Post-details passes this so it doesn't push a duplicate of itself.
    onPressComments?: () => void;

    // The feed card keeps a (non-functional) share affordance.
    showShare?: boolean;
};

export default function PostActions({
    post,
    variant = "default",
    onPressComments,
    showShare = false,
}: PostActionsProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const toggleLike = useToggleLike();

    const isLiked = post.isLikedByMe;
    const compact = variant === "compact";
    const iconSize = compact ? 16 : 20;
    const textClass = compact ? "text-label-sm" : "text-body-sm";
    const buttonClass = compact
        ? "flex-row items-center gap-1.5 px-2.5 py-2"
        : "flex-row items-center gap-2 rounded-full px-4 py-3";

    function openComments() {
        if (onPressComments) {
            onPressComments();
            return;
        }

        router.push(`/post/${post.id}`);
    }

    return (
        <>
            <Pressable
                onPress={() => toggleLike.mutate(post.id)}
                accessibilityRole="button"
                accessibilityLabel={
                    isLiked
                        ? `Unlike post. ${post.likesCount} likes`
                        : `Like post. ${post.likesCount} likes`
                }
                accessibilityState={{ selected: isLiked }}
                hitSlop={6}
                className={buttonClass}
            >
                <Heart
                    size={iconSize}
                    color={isLiked ? colors.primary : colors.textSecondary}
                    fill={isLiked ? colors.primary : "transparent"}
                />

                <Text
                    className={
                        isLiked
                            ? `${textClass} font-semibold text-primary`
                            : `${textClass} text-text-secondary`
                    }
                >
                    {post.likesCount}
                </Text>
            </Pressable>

            <Pressable
                onPress={openComments}
                accessibilityRole="button"
                accessibilityLabel={`View comments. ${post.commentsCount} comments`}
                hitSlop={6}
                className={buttonClass}
            >
                <MessageCircle size={iconSize} color={colors.textSecondary} />

                <Text className={`${textClass} text-text-secondary`}>
                    {post.commentsCount}
                </Text>
            </Pressable>

            {showShare && (
                <Pressable className="flex-row items-center gap-2 rounded-full px-4 py-3">
                    <Send size={20} color={colors.textSecondary} />
                </Pressable>
            )}
        </>
    );
}
