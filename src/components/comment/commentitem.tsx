import { Image as ExpoImage } from "expo-image";
import { ChevronDown, ChevronUp, Heart, MoreHorizontal, Reply, Trash2 } from "lucide-react-native";
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
import useToggleCommentLike from "@/hooks/mutations/useToggleCommentLike";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { haptics } from "@/lib/haptics";
import { parseGifContent } from "@/services/gifService";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { PostComment } from "@/types/post";
import CommentForm from "./commentform";

export default function CommentItem({
    postId,
    comment,
    depth = 0,
}: {
    postId: string;
    comment: PostComment;
    depth?: number;
}) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const deleteComment = useDeleteComment();
    const toggleCommentLike = useToggleCommentLike();

    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [lightboxUri, setLightboxUri] = useState<string | null>(null);
    const [isReplying, setIsReplying] = useState(false);
    const [showReplies, setShowReplies] = useState(true);

    const colors = isDark ? themeColors.dark : themeColors.light;

    const isOwner = user?.id === comment.author.id;
    const isLiked = Boolean(comment.isLiked);
    const likesCount = comment.likesCount ?? 0;

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

    function handleToggleLike() {
        if (toggleCommentLike.isPending) return;
        toggleCommentLike.mutate({ postId, commentId: comment.id });
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
        <View className="flex-col w-full">
            <View className="flex-row gap-3">
                <Avatar
                    src={comment.author.avatarUrl}
                    name={comment.author.name}
                    className={depth > 0 ? "h-7 w-7" : "h-9 w-9"}
                />

                <View className="flex-1 rounded-2xl bg-surface-low p-3">
                    <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-row items-center gap-1.5 flex-wrap flex-1">
                            <Text className="text-label-md font-semibold text-text-primary">
                                {comment.author.name}
                            </Text>
                            {Boolean(comment.parentAuthorName) && depth > 0 && (
                                <Text className="text-[11px] text-text-secondary">
                                    replying to{" "}
                                    <Text className="font-semibold text-primary">
                                        @{comment.parentAuthorName}
                                    </Text>
                                </Text>
                            )}
                        </View>

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

                    {/* Actions Row: Like & Reply */}
                    <View className="flex-row items-center gap-4 mt-2.5 pt-1.5 border-t border-border/30">
                        <Pressable
                            onPress={handleToggleLike}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={isLiked ? "Unlike comment" : "Like comment"}
                            className="flex-row items-center gap-1.5"
                        >
                            <Heart
                                size={14}
                                color={isLiked ? colors.primary : colors.textSecondary}
                                fill={isLiked ? colors.primary : "transparent"}
                            />
                            <Text
                                className={`text-label-sm font-medium ${
                                    isLiked ? "text-primary font-semibold" : "text-text-secondary"
                                }`}
                            >
                                {likesCount > 0 ? likesCount : "Like"}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setIsReplying((prev) => !prev)}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Reply to comment"
                            className="flex-row items-center gap-1.5"
                        >
                            <Reply size={14} color={colors.textSecondary} />
                            <Text className="text-label-sm font-medium text-text-secondary">
                                Reply
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Inline Reply Composer */}
            {isReplying && (
                <View className="ml-10 mt-2">
                    <CommentForm
                        postId={postId}
                        parentCommentId={comment.id}
                        replyingTo={{
                            name: comment.author.name,
                            username: comment.author.username,
                        }}
                        onCancelReply={() => setIsReplying(false)}
                        onSuccess={() => {
                            setIsReplying(false);
                            setShowReplies(true);
                        }}
                    />
                </View>
            )}

            {/* Nested Threaded Replies */}
            {Boolean(comment.replies && comment.replies.length > 0) && (
                <View className="ml-5 mt-3">
                    {showReplies ? (
                        <View className="pl-3 border-l-2 border-border/50 gap-3">
                            {comment.replies!.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    postId={postId}
                                    comment={reply}
                                    depth={depth + 1}
                                />
                            ))}

                            {comment.replies!.length > 2 && (
                                <Pressable
                                    onPress={() => {
                                        haptics.selection();
                                        setShowReplies(false);
                                    }}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Hide replies"
                                    className="flex-row items-center gap-1.5 pt-1"
                                >
                                    <ChevronUp size={13} color={colors.textSecondary} />
                                    <Text className="text-label-sm font-medium text-text-secondary">
                                        Hide replies
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    ) : (
                        <Pressable
                            onPress={() => {
                                haptics.selection();
                                setShowReplies(true);
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${comment.replies!.length} replies`}
                            className="flex-row items-center gap-2 py-1"
                        >
                            <View className="w-5 h-[1.5px] bg-border" />
                            <ChevronDown size={14} color={colors.textSecondary} />
                            <Text className="text-label-sm font-semibold text-text-secondary">
                                View {comment.replies!.length}{" "}
                                {comment.replies!.length === 1 ? "reply" : "replies"}
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}

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
                destructive={false}
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
