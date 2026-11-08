import { Image as ExpoImage } from "expo-image";
import { X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import Avatar from "@/components/avatar";
import GifPicker from "@/components/common/gifpicker";
import GradientButton from "@/components/ui/gradientbutton";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useAddComment from "@/hooks/mutations/useAddComment";
import { haptics } from "@/lib/haptics";
import { GifItem } from "@/services/gifService";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function CommentForm({
    postId,
    parentCommentId = null,
    replyingTo = null,
    onCancelReply,
    onSuccess,
}: {
    postId: string;
    parentCommentId?: string | null;
    replyingTo?: { name: string; username?: string } | null;
    onCancelReply?: () => void;
    onSuccess?: () => void;
}) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const addComment = useAddComment();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [text, setText] = useState("");
    const [selectedGif, setSelectedGif] = useState<GifItem | null>(null);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSubmitting = addComment.isPending;

    async function handleSubmit() {
        if (isSubmitting) return;

        const trimmed = text.trim();

        if (!trimmed && !selectedGif) {
            setError("Please write a comment or attach a GIF.");
            return;
        }

        setError(null);

        const content = trimmed
            ? selectedGif
                ? `${trimmed}\n${selectedGif.url}`
                : trimmed
            : selectedGif!.url;

        try {
            await addComment.mutateAsync({ postId, content, parentCommentId });
            setText("");
            setSelectedGif(null);
            haptics.medium();
            onSuccess?.();
        } catch (caught) {
            haptics.error();
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : "Could not add the comment."
            );
        }
    }

    const canSubmit = Boolean(text.trim() || selectedGif);

    return (
        <View className="gap-3">
            {replyingTo && (
                <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface-low px-3 py-2">
                    <Text className="text-body-sm text-text-secondary">
                        Replying to{" "}
                        <Text className="font-semibold text-primary">
                            @{replyingTo.username || replyingTo.name}
                        </Text>
                    </Text>
                    {onCancelReply && (
                        <Pressable
                            onPress={onCancelReply}
                            hitSlop={8}
                            accessibilityLabel="Cancel reply"
                        >
                            <X size={14} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>
            )}

            <View className="flex-row items-start gap-3">
                <Avatar
                    src={user?.avatarUrl}
                    name={user?.name ?? ""}
                    className={parentCommentId ? "h-8 w-8" : "h-9 w-9"}
                />

                <View className="flex-1 gap-2">
                    <TextInput
                        value={text}
                        onChangeText={(value) => {
                            setText(value);
                            setError(null);
                        }}
                        placeholder={parentCommentId ? "Write a reply..." : "Add a comment..."}
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        textAlignVertical="top"
                        maxLength={1000}
                        autoFocus={Boolean(parentCommentId)}
                        className={`rounded-2xl border border-border bg-surface-low px-4 py-3 text-body-sm text-text-primary ${
                            parentCommentId ? "min-h-[60px]" : "min-h-[70px]"
                        }`}
                    />

                    {/* Selected GIF Preview */}
                    {selectedGif && (
                        <View className="self-start overflow-hidden rounded-2xl border border-border bg-surface-low" style={{ width: 140, height: 100 }}>
                            <ExpoImage
                                source={{ uri: selectedGif.previewUrl || selectedGif.url }}
                                style={{ width: "100%", height: "100%" }}
                                contentFit="cover"
                            />
                            <Pressable
                                onPress={() => setSelectedGif(null)}
                                accessibilityRole="button"
                                accessibilityLabel="Remove GIF"
                                hitSlop={6}
                                className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-1"
                            >
                                <X size={12} color="#ffffff" />
                            </Pressable>
                            <View className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1 py-0.5">
                                <Text className="text-[9px] font-bold text-white tracking-wider">
                                    GIF
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {error && <Text className="text-body-sm text-error">{error}</Text>}

            <View className="flex-row items-center justify-between pl-12">
                <Pressable
                    onPress={() => {
                        haptics.selection();
                        setShowGifPicker(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Add GIF"
                    hitSlop={6}
                    className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 border ${
                        selectedGif
                            ? "border-primary bg-primary/10"
                            : "border-border bg-surface-low"
                    }`}
                >
                    <Text
                        className={`text-[11px] font-bold ${
                            selectedGif ? "text-primary" : "text-text-secondary"
                        }`}
                    >
                        GIF
                    </Text>
                </Pressable>

                <View className="flex-row items-center gap-3">
                    {onCancelReply && (
                        <Pressable
                            onPress={onCancelReply}
                            hitSlop={6}
                            accessibilityLabel="Cancel"
                        >
                            <Text className="text-body-sm font-medium text-text-secondary">
                                Cancel
                            </Text>
                        </Pressable>
                    )}

                    <GradientButton
                        onPress={handleSubmit}
                        disabled={isSubmitting || !canSubmit}
                        icon={isSubmitting ? <ActivityIndicator size="small" color={colors.buttonGradientText} /> : undefined}
                        label={isSubmitting ? "Posting..." : parentCommentId ? "Reply" : "Post"}
                        accessibilityLabel={parentCommentId ? "Add reply" : "Add comment"}
                        className="rounded-full"
                        contentStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
                        textClassName="text-body-sm font-semibold"
                    />
                </View>
            </View>

            <GifPicker
                visible={showGifPicker}
                onClose={() => setShowGifPicker(false)}
                onSelect={(gif) => {
                    setSelectedGif(gif);
                    setShowGifPicker(false);
                }}
            />
        </View>
    );
}
