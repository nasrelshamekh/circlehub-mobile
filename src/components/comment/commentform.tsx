import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import Avatar from "@/components/avatar";
import GradientButton from "@/components/ui/gradientbutton";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useAddComment from "@/hooks/mutations/useAddComment";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

export default function CommentForm({ postId }: { postId: string }) {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const addComment = useAddComment();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);

    const isSubmitting = addComment.isPending;

    async function handleSubmit() {
        if (isSubmitting) return;

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
        <View className="gap-3">
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

            <GradientButton
                onPress={handleSubmit}
                disabled={isSubmitting}
                label={isSubmitting ? "Posting..." : "Post"}
                accessibilityLabel="Add comment"
                className="self-end rounded-full"
                contentStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
                textClassName="text-body-sm font-semibold"
            />
        </View>
    );
}