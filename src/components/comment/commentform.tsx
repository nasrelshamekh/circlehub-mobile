import { useState } from "react";
import {
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import Avatar from "@/components/avatar";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useAddComment from "@/hooks/mutations/useAddComment";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

/**
 * Comment composer. Submits via useAddComment, which prepends the new comment
 * to the post-details cache and bumps counts everywhere else.
 */
export default function CommentForm({ postId }: { postId: string }) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const addComment = useAddComment();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);

    const isSubmitting = addComment.isPending;

    async function handleSubmit() {
        if (isSubmitting) {
            return;
        }

        const trimmed = text.trim();

        if (!trimmed) {
            setError("Please write a comment first.");
            return;
        }

        setError(null);

        try {
            await addComment.mutateAsync({ postId, content: trimmed });
            setText("");
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : "Could not add the comment."
            );
        }
    }

    return (
        <View style={{ gap: 12 }}>
            <View className="flex-row items-start gap-3">
                <Avatar
                    src={user?.avatarUrl}
                    name={user?.name ?? ""}
                    className="h-9 w-9"
                />

                <TextInput
                    value={text}
                    onChangeText={(value) => {
                        setText(value);
                        setError(null);
                    }}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    textAlignVertical="top"
                    maxLength={1000}
                    className="flex-1 rounded-2xl border border-border bg-surface-low px-4 py-3 text-body-sm text-text-primary"
                />
            </View>

            {error && <Text className="text-body-sm text-error">{error}</Text>}

            <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Add comment"
                className="self-end rounded-full bg-primary px-5 py-2"
                style={{ opacity: isSubmitting ? 0.6 : 1 }}
            >
                <Text className="text-body-sm font-semibold text-on-primary">
                    {isSubmitting ? "Posting..." : "Post"}
                </Text>
            </Pressable>
        </View>
    );
}