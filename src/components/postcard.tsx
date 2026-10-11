import { router } from "expo-router";
import { MoreHorizontal } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import EditPostModal from "@/components/editpostmodal";
import PostActions from "@/components/postactions";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useDeletePost from "@/hooks/mutations/useDeletePost";
import { formatPostDate } from "@/lib/formatPostDate";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { Post } from "@/types/post";

import type { AlertButton } from "react-native";

export default function PostCard({
    post,
    onPressComments,
    onDeleted,
    canDelete,
    community,
}: {
    post: Post;

    // Post-details passes this so it doesn't push a duplicate of itself.
    onPressComments?: () => void;
    onDeleted?: () => void;

    // Community admins and moderators delete posts they don't own.
    canDelete?: boolean;

    // Community screens pass this because their posts omit the community field.
    community?: { id: string; slug: string };
}) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const deletePost = useDeletePost();

    const [editOpen, setEditOpen] = useState(false);

    const colors = isDark ? themeColors.dark : themeColors.light;
    const imageUri = getImageUrl(post.imageUrl);

    const isOwner = user?.id === post.author.id;
    const canDeletePost = isOwner || Boolean(canDelete);

    async function handleDelete() {
        try {
            await deletePost.mutateAsync({ post, community });
            onDeleted?.();
        } catch (caught) {
            Alert.alert(
                "Could not delete post",
                caught instanceof ApiError
                    ? caught.message
                    : "Please try again."
            );
        }
    }

    function openMenu() {
        const buttons: AlertButton[] = [];

        if (isOwner) {
            buttons.push({ text: "Edit post", onPress: () => setEditOpen(true) });
        }

        if (canDeletePost) {
            buttons.push({
                text: "Delete post",
                style: "destructive",
                onPress: handleDelete,
            });
        }

        buttons.push({ text: "Cancel", style: "cancel" });

        Alert.alert("Post options", undefined, buttons);
    }

    return (
        <>
            <View className="my-2 rounded-lg bg-surface-lowest p-5 gap-4">
                <View className="flex-row items-start justify-between">
                    <Pressable
                        onPress={() =>
                            router.push({
                                pathname: "/profile/[username]",
                                params: { username: post.author.username },
                            })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`View ${post.author.name}'s profile`}
                        className="flex-row items-center gap-3"
                    >
                        <Avatar
                            src={post.author.avatarUrl}
                            name={post.author.name}
                            className="h-11 w-11"
                        />

                        <View>
                            <Text className="text-label-md font-semibold text-text-primary">
                                {post.author.name}
                            </Text>

                            <Text className="text-body-sm text-text-secondary">
                                {formatPostDate(post.createdAt)}
                            </Text>
                        </View>
                    </Pressable>

                    {(isOwner || canDeletePost) && (
                        <Pressable
                            onPress={openMenu}
                            accessibilityRole="button"
                            accessibilityLabel="Open post actions"
                            className="h-10 w-10 items-center justify-center rounded-full"
                        >
                            <MoreHorizontal size={18} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>

                {post.content && (
                    <View>
                        <Text className="text-body-md text-text-secondary">
                            {post.content}
                        </Text>
                    </View>
                )}

                {imageUri && (
                    <Image
                        source={{ uri: imageUri }}
                        className="h-[200px] w-full rounded-2xl"
                        resizeMode="cover"
                    />
                )}

                <View className="flex-row items-center gap-2 pt-3">
                    <PostActions
                        post={post}
                        onPressComments={onPressComments}
                        showShare
                    />
                </View>
            </View>

            {editOpen && (
                <EditPostModal post={post} onClose={() => setEditOpen(false)} />
            )}
        </>
    );
}
