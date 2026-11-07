import { Image as ExpoImage } from "expo-image";
import { MoreHorizontal, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import MediaLightbox from "@/components/common/medialightbox";
import RichText from "@/components/common/richtext";
import ActionModal, { ActionOption } from "@/components/ui/actionmodal";
import ConfirmModal from "@/components/ui/confirmmodal";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useDeleteComment from "@/hooks/mutations/useDeleteComment";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { parseGifContent } from "@/services/gifService";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { PostComment } from "@/types/post";

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

    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [lightboxUri, setLightboxUri] = useState<string | null>(null);

    const colors = isDark ? themeColors.dark : themeColors.light;

    const isOwner = user?.id === comment.author.id;

    const { text, gifUrl } = useMemo(
        () => parseGifContent(comment.content),
        [comment.content]
    );

    async function handleDelete() {
        try {
            setIsDeleting(true);
            setDeleteError(null);
            await deleteComment.mutateAsync({
                postId,
                commentId: comment.id,
            });
            setConfirmDeleteOpen(false);
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

    const menuOptions: ActionOption[] = [
        {
            key: "delete",
            label: "Delete comment",
            destructive: true,
            icon: <Trash2 size={16} color={colors.error} />,
            onPress: () => {
                setDeleteError(null);
                setConfirmDeleteOpen(true);
            },
        },
    ];

    function openMenu() {
        setMenuOpen(true);
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
                            {formatRelativeTime(comment.createdAt)}
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

                {Boolean(text) && (
                    <RichText
                        text={text}
                        className="mt-1 text-body-sm text-text-secondary"
                    />
                )}

                {Boolean(gifUrl) && (
                    <Pressable
                        onPress={() => setLightboxUri(gifUrl)}
                        accessibilityRole="button"
                        accessibilityLabel="View comment GIF"
                        className="mt-2 self-start overflow-hidden rounded-2xl border border-border bg-surface-lowest"
                        style={{ width: 200, height: 140 }}
                    >
                        <ExpoImage
                            source={{ uri: gifUrl! }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            transition={150}
                        />
                        <View className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1 py-0.5">
                            <Text className="text-[9px] font-bold text-white tracking-wider">
                                GIF
                            </Text>
                        </View>
                    </Pressable>
                )}
            </View>

            <ActionModal
                visible={menuOpen}
                title="Comment options"
                options={menuOptions}
                onClose={() => setMenuOpen(false)}
            />

            <ConfirmModal
                visible={confirmDeleteOpen}
                title="Delete comment?"
                message={
                    deleteError ??
                    "Are you sure you want to delete this comment? This action cannot be undone."
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
                visible={Boolean(lightboxUri)}
                imageUri={lightboxUri}
                altText="Comment GIF"
                onClose={() => setLightboxUri(null)}
            />
        </View>
    );
}
