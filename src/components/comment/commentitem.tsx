import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal } from "lucide-react-native";
import { PostComment } from "@/types/post";

import { Alert, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useDeleteComment from "@/hooks/mutations/useDeleteComment";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function CommentItem({
    postId,
    comment,
}: {
    postId: string;
    comment: PostComment;
}) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const deleteComment = useDeleteComment();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const isOwner = user?.id === comment.author.id;

    async function handleDelete() {
        try {
            await deleteComment.mutateAsync({
                postId,
                commentId: comment.id,
            });
        } catch (caught) {
            Alert.alert(
                "Could not delete comment",
                caught instanceof ApiError
                    ? caught.message
                    : "Please try again."
            );
        }
    }

    function openMenu() {
        Alert.alert("Comment options", undefined, [
            { text: "Delete comment", style: "destructive", onPress: handleDelete },
            { text: "Cancel", style: "cancel" },
        ]);
    }

    return (
        <View className="flex-row gap-3">
            <Avatar
                src={comment.author.avatarUrl}
                name={comment.author.name}
                className="h-9 w-9"
            />

            <View className="flex-1 rounded-2xl bg-surface-low p-3">
                <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-label-md font-semibold text-text-primary">
                        {comment.author.name}
                    </Text>

                    <View className="flex-row items-center gap-2">
                        <Text className="text-label-sm text-text-secondary">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                            })}
                        </Text>

                        {isOwner && (
                            <Pressable
                                onPress={openMenu}
                                accessibilityRole="button"
                                accessibilityLabel="Open comment actions"
                                hitSlop={6}
                            >
                                <MoreHorizontal
                                    size={16}
                                    color={colors.textSecondary}
                                />
                            </Pressable>
                        )}
                    </View>
                </View>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    {comment.content}
                </Text>
            </View>
        </View>
    );
}
