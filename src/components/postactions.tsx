import { router } from "expo-router";
import { Bookmark, Heart, MessageCircle, Send } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text } from "react-native";

import SharePostModal from "@/components/messages/sharepostmodal";
import { useTheme } from "@/context/themecontext";
import useToggleLike from "@/hooks/mutations/useToggleLike";
import useBookmarks from "@/hooks/useBookmarks";
import { themeColors } from "@/theme/colors";
import { Post } from "@/types/post";

type PostActionsProps = {
    post: Post;

    variant?: "default" | "compact";

    onPressComments?: () => void;

    showShare?: boolean;

    showBookmark?: boolean;
};

export default function PostActions({
    post,
    variant = "default",
    onPressComments,
    showShare = false,
    showBookmark = true,
}: PostActionsProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const toggleLike = useToggleLike();
    const { isBookmarked, toggleBookmark } = useBookmarks();
    const [shareOpen, setShareOpen] = useState(false);

    const isLiked = post.isLikedByMe;
    const bookmarked = isBookmarked(post.id);
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
                <Pressable
                    onPress={() => setShareOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Send post to a friend"
                    hitSlop={6}
                    className="flex-row items-center gap-2 rounded-full px-4 py-3"
                >
                    <Send size={20} color={colors.textSecondary} />
                </Pressable>
            )}

            {showBookmark && (
                <Pressable
                    onPress={() => toggleBookmark(post)}
                    accessibilityRole="button"
                    accessibilityLabel={
                        bookmarked ? "Remove bookmark" : "Save post"
                    }
                    accessibilityState={{ selected: bookmarked }}
                    hitSlop={6}
                    className={
                        compact
                            ? buttonClass
                            : "flex-row items-center gap-2 rounded-full px-4 py-3"
                    }
                >
                    <Bookmark
                        size={iconSize}
                        color={bookmarked ? colors.primary : colors.textSecondary}
                        fill={bookmarked ? colors.primary : "transparent"}
                    />
                </Pressable>
            )}

            {shareOpen && (
                <SharePostModal
                    post={post}
                    onClose={() => setShareOpen(false)}
                />
            )}
        </>
    );
}
