import * as Clipboard from "expo-clipboard";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { Copy, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, Share, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import MediaLightbox from "@/components/common/medialightbox";
import RichText from "@/components/common/richtext";
import EditPostModal from "@/components/editpostmodal";
import PollWidget from "@/components/pollwidget";
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
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

    const colors = isDark ? themeColors.dark : themeColors.light;
    const rawImages =
        post.imageUrls && post.imageUrls.length > 0
            ? post.imageUrls
            : post.imageUrl
              ? [post.imageUrl]
              : [];
    const allImages = rawImages.map(getImageUrl).filter(Boolean) as string[];
    const firstImageUri = allImages[0] ?? null;

    useEffect(() => {
        if (firstImageUri && isDetailsPage && allImages.length === 1) {
            Image.getSize(
                firstImageUri,
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
    }, [firstImageUri, isDetailsPage, allImages.length]);

    function handleOpenImage(uri: string) {
        setSelectedImageUri(uri);
        setLightboxOpen(true);
    }

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

    const postUrl = `https://circlehub.app/post/${post.id}`;

    const menuOptions: ActionOption[] = [
        {
            key: "copy-link",
            label: "Copy link",
            icon: <Copy size={18} color={colors.textPrimary} />,
            onPress: async () => {
                await Clipboard.setStringAsync(postUrl);
            },
        },
        {
            key: "share-post",
            label: "Share post",
            icon: <Share2 size={18} color={colors.textPrimary} />,
            onPress: async () => {
                try {
                    await Share.share({
                        title: `Post by ${post.author.name}`,
                        message: post.content
                            ? `${post.content}\n\n${postUrl}`
                            : postUrl,
                        url: postUrl,
                    });
                } catch {}
            },
        },
    ];

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

                    <Pressable
                        onPress={openMenu}
                        accessibilityRole="button"
                        accessibilityLabel="Open post actions"
                        className="h-10 w-10 items-center justify-center rounded-full"
                    >
                        <MoreHorizontal size={18} color={colors.textSecondary} />
                    </Pressable>
                </View>

                {post.content &&
                    (!post.poll ||
                        post.content.trim() !== post.poll.question?.trim()) && (
                    <Pressable
                        onPress={openPost}
                        disabled={isDetailsPage}
                        accessibilityRole={isDetailsPage ? "none" : "button"}
                        accessibilityLabel="View post details"
                    >
                        <RichText
                            text={post.content}
                            className="text-body-md text-text-secondary"
                            onPressBase={openPost}
                        />
                    </Pressable>
                )}

                {post.poll && (
                    <PollWidget postId={post.id} poll={post.poll} />
                )}

                {allImages.length === 1 && (
                    <Pressable
                        onPress={() => handleOpenImage(allImages[0])}
                        accessibilityRole="button"
                        accessibilityLabel="Open full-screen image preview"
                    >
                        {isDetailsPage ? (
                            <ExpoImage
                                source={{ uri: allImages[0] }}
                                onLoad={(e) => {
                                    const { width, height } = e.source;
                                    if (width > 0 && height > 0) {
                                        setAspectRatio(width / height);
                                    }
                                }}
                                style={
                                    aspectRatio
                                        ? { width: "100%", aspectRatio }
                                        : { width: "100%", minHeight: 250 }
                                }
                                className="w-full rounded-2xl"
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={150}
                            />
                        ) : (
                            <ExpoImage
                                source={{ uri: allImages[0] }}
                                className="h-[200px] w-full rounded-2xl"
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={150}
                            />
                        )}
                    </Pressable>
                )}

                {allImages.length === 2 && (
                    <View className="flex-row gap-2 h-[200px] w-full">
                        {allImages.map((uri, idx) => (
                            <Pressable
                                key={idx}
                                onPress={() => handleOpenImage(uri)}
                                className="flex-1 overflow-hidden rounded-2xl"
                                accessibilityRole="button"
                                accessibilityLabel={`View image ${idx + 1}`}
                            >
                                <ExpoImage
                                    source={{ uri }}
                                    className="h-full w-full"
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    transition={150}
                                />
                            </Pressable>
                        ))}
                    </View>
                )}

                {allImages.length === 3 && (
                    <View className="flex-row gap-2 h-[220px] w-full">
                        <Pressable
                            onPress={() => handleOpenImage(allImages[0])}
                            className="flex-1 overflow-hidden rounded-2xl"
                            accessibilityRole="button"
                            accessibilityLabel="View image 1"
                        >
                            <ExpoImage
                                source={{ uri: allImages[0] }}
                                className="h-full w-full"
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={150}
                            />
                        </Pressable>
                        <View className="flex-1 gap-2">
                            {allImages.slice(1, 3).map((uri, idx) => (
                                <Pressable
                                    key={idx}
                                    onPress={() => handleOpenImage(uri)}
                                    className="flex-1 overflow-hidden rounded-2xl"
                                    accessibilityRole="button"
                                    accessibilityLabel={`View image ${idx + 2}`}
                                >
                                    <ExpoImage
                                        source={{ uri }}
                                        className="h-full w-full"
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={150}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

                {allImages.length >= 4 && (
                    <View className="gap-2 w-full">
                        <View className="flex-row gap-2 h-[120px] w-full">
                            {allImages.slice(0, 2).map((uri, idx) => (
                                <Pressable
                                    key={idx}
                                    onPress={() => handleOpenImage(uri)}
                                    className="flex-1 overflow-hidden rounded-2xl"
                                    accessibilityRole="button"
                                    accessibilityLabel={`View image ${idx + 1}`}
                                >
                                    <ExpoImage
                                        source={{ uri }}
                                        className="h-full w-full"
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={150}
                                    />
                                </Pressable>
                            ))}
                        </View>
                        <View className="flex-row gap-2 h-[120px] w-full">
                            <Pressable
                                onPress={() => handleOpenImage(allImages[2])}
                                className="flex-1 overflow-hidden rounded-2xl"
                                accessibilityRole="button"
                                accessibilityLabel="View image 3"
                            >
                                <ExpoImage
                                    source={{ uri: allImages[2] }}
                                    className="h-full w-full"
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    transition={150}
                                />
                            </Pressable>
                            <Pressable
                                onPress={() => handleOpenImage(allImages[3])}
                                className="relative flex-1 overflow-hidden rounded-2xl"
                                accessibilityRole="button"
                                accessibilityLabel={`View image 4${allImages.length > 4 ? ` and ${allImages.length - 4} more` : ""}`}
                            >
                                <ExpoImage
                                    source={{ uri: allImages[3] }}
                                    className="h-full w-full"
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    transition={150}
                                />
                                {allImages.length > 4 && (
                                    <View className="absolute inset-0 items-center justify-center bg-black/60">
                                        <Text className="text-title-lg font-bold text-white">
                                            +{allImages.length - 3}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>
                    </View>
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

            <MediaLightbox
                visible={lightboxOpen}
                imageUri={selectedImageUri ?? firstImageUri}
                altText={post.content}
                onClose={() => setLightboxOpen(false)}
            />
        </>
    );
}
