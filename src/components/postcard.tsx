import { router } from "expo-router";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import EditPostModal from "@/components/editpostmodal";
import PostActions from "@/components/postactions";
import ActionModal, { ActionOption } from "@/components/ui/actionmodal";
import ConfirmModal from "@/components/ui/confirmmodal";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useDeletePost from "@/hooks/mutations/useDeletePost";
import { formatPostDate } from "@/lib/formatPostDate";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { Post } from "@/types/post";

export default function PostCard({
    post,
    onPressComments,
    onDeleted,
    canDelete,
    community,
    isDetailsPage = false,
}: {
    post: Post;

    onPressComments?: () => void;
    onDeleted?: () => void;

    canDelete?: boolean;

    community?: { id: string; slug: string };

    isDetailsPage?: boolean;
}) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const deletePost = useDeletePost();

    const [editOpen, setEditOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);

    const colors = isDark ? themeColors.dark : themeColors.light;
    const imageUri = getImageUrl(post.imageUrl);

    useEffect(() => {
        if (imageUri && isDetailsPage) {
            Image.getSize(
                imageUri,
                (width, height) => {
                    if (width > 0 && height > 0) {
                        setAspectRatio(width / height);
                    }
                },
                () => {
                    // Fallback
                }
            );
        }
    }, [imageUri, isDetailsPage]);

    function openPost() {
        if (!isDetailsPage) {
            router.push(`/post/${post.id}`);
        }
    }

    const isOwner = user?.id === post.author.id;
    const canDeletePost = isOwner || Boolean(canDelete);

    async function handleDelete() {
        try {
            setIsDeleting(true);
            setDeleteError(null);
            await deletePost.mutateAsync({ post, community });
            setConfirmDeleteOpen(false);
            onDeleted?.();
        } catch (caught) {
            setDeleteError(
                caught instanceof ApiError
                    ? caught.message
                    : "Please try again."
            );
        } finally {
            setIsDeleting(false);
        }
    }

    const menuOptions: ActionOption[] = [];

    if (isOwner) {
        menuOptions.push({
            key: "edit",
            label: "Edit post",
            icon: <Pencil size={18} color={colors.textPrimary} />,
            onPress: () => setEditOpen(true),
        });
    }

    if (canDeletePost) {
        menuOptions.push({
            key: "delete",
            label: "Delete post",
            destructive: true,
            icon: <Trash2 size={18} color={colors.error} />,
            onPress: () => {
                setDeleteError(null);
                setConfirmDeleteOpen(true);
            },
        });
    }

    function openMenu() {
        setMenuOpen(true);
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
                    <Pressable
                        onPress={openPost}
                        disabled={isDetailsPage}
                        accessibilityRole={isDetailsPage ? "none" : "button"}
                        accessibilityLabel="View post details"
                    >
                        <Text className="text-body-md text-text-secondary">
                            {post.content}
                        </Text>
                    </Pressable>
                )}

                {imageUri && (
                    <Pressable
                        onPress={openPost}
                        disabled={isDetailsPage}
                        accessibilityRole={isDetailsPage ? "none" : "button"}
                        accessibilityLabel="View post details"
                    >
                        {isDetailsPage ? (
                            <Image
                                source={{ uri: imageUri }}
                                style={
                                    aspectRatio
                                        ? { width: "100%", aspectRatio }
                                        : { width: "100%", height: 350 }
                                }
                                className="w-full rounded-2xl"
                                resizeMode="contain"
                            />
                        ) : (
                            <Image
                                source={{ uri: imageUri }}
                                className="h-[200px] w-full rounded-2xl"
                                resizeMode="cover"
                            />
                        )}
                    </Pressable>
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

            <ActionModal
                visible={menuOpen}
                title="Post options"
                options={menuOptions}
                onClose={() => setMenuOpen(false)}
            />

            <ConfirmModal
                visible={confirmDeleteOpen}
                title="Delete post?"
                message={
                    deleteError ??
                    "Are you sure you want to delete this post? This action cannot be undone."
                }
                confirmText="Delete"
                destructive
                loading={isDeleting}
                onCancel={() => {
                    setConfirmDeleteOpen(false);
                    setDeleteError(null);
                }}
                onConfirm={handleDelete}
            />
        </>
    );
}
