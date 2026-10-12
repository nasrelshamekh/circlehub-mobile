import * as ImagePicker from "expo-image-picker";
import { Images, LoaderCircle, X } from "lucide-react-native";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import useUpdatePost from "@/hooks/mutations/useUpdatePost";
import {
    imageFromAsset,
    UploadImage,
    validateUploadImage,
} from "@/lib/imageUpload";
import { getImageUrl } from "@/lib/imageUrl";
import { ApiError } from "@/types/api";
import { Post } from "@/types/post";
import { themeColors } from "@/theme/colors";

export default function EditPostModal({
    post,
    onClose,
}: {
    post: Post;
    onClose: () => void;
}) {
    const { isDark } = useTheme();
    const updatePost = useUpdatePost();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [content, setContent] = useState(post.content);
    const [image, setImage] = useState<UploadImage | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isSubmitting = updatePost.isPending;
    const previewUri = image?.uri ?? getImageUrl(post.imageUrl);

    async function pickImage() {
        setError(null);

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
        });

        if (result.canceled) return;

        const asset = result.assets[0];
        const picked = imageFromAsset(asset);
        const size = picked.file?.size ?? asset.fileSize;
        const validationError = validateUploadImage(picked.type, size);

        if (validationError) {
            setError(validationError);
            return;
        }

        setImage(picked);
    }

    async function handleSubmit() {
        if (isSubmitting) return;

        const trimmed = content.trim();

        // The API marks content as required, so an image alone won't save.
        if (!trimmed) {
            setError("Please write something first.");
            return;
        }

        setError(null);

        try {
            await updatePost.mutateAsync({ postId: post.id, content: trimmed, image });
            onClose();
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : "Could not update the post."
            );
        }
    }

    return (
        <Modal visible animationType="slide" onRequestClose={onClose}>
            <SafeAreaView className="flex-1 bg-surface-low" edges={["top", "bottom"]}>
                <KeyboardAvoidingView
                    className="flex-1"
                    behavior="padding"
                    keyboardVerticalOffset={16}
                >
                    <View className="flex-row items-center justify-between px-4 py-3">
                        <Text className="text-title-lg font-semibold text-text-primary">
                            Edit Post
                        </Text>

                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel"
                            hitSlop={8}
                        >
                            <Text className="text-body-md font-semibold text-primary">
                                Cancel
                            </Text>
                        </Pressable>
                    </View>

                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="gap-4 p-4"
                        keyboardShouldPersistTaps="handled"
                    >
                        <View className="flex-row items-center gap-3">
                            <Avatar
                                src={post.author.avatarUrl}
                                name={post.author.name}
                                className="h-12 w-12"
                            />

                            <View>
                                <Text className="text-label-md font-semibold text-text-primary">
                                    {post.author.name}
                                </Text>

                                <Text className="text-label-sm text-text-secondary">
                                    Editing your post
                                </Text>
                            </View>
                        </View>

                        <TextInput
                            value={content}
                            onChangeText={(value) => {
                                setContent(value);
                                setError(null);
                            }}
                            placeholder="Share something new..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            textAlignVertical="top"
                            maxLength={5000}
                            className="min-h-36 rounded-xl border border-border bg-surface-lowest p-4 text-body-md text-text-primary"
                        />

                        {previewUri && (
                            <View className="overflow-hidden rounded-xl">
                                <Image
                                    source={{ uri: previewUri }}
                                    className="w-full h-[260px]"
                                    resizeMode="cover"
                                />

                                {/* Only a newly picked image can be cleared; the original survives. */}
                                {image && (
                                    <Pressable
                                        onPress={() => setImage(null)}
                                        accessibilityLabel="Remove selected photo"
                                        className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-surface-lowest"
                                    >
                                        <X size={18} color={colors.textPrimary} />
                                    </Pressable>
                                )}
                            </View>
                        )}

                        {error && (
                            <Text className="text-body-sm text-error">{error}</Text>
                        )}

                        <View className="flex-row items-center justify-between">
                            <Text className="text-label-md text-text-secondary">
                                Update your post:
                            </Text>

                            <Pressable
                                onPress={pickImage}
                                accessibilityLabel="Replace photo"
                                className="h-10 w-10 items-center justify-center rounded-full"
                            >
                                <Images size={22} color={colors.primary} />
                            </Pressable>
                        </View>

                        <GradientButton
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            icon={
                                isSubmitting ? (
                                    <LoaderCircle
                                        size={18}
                                        color={colors.buttonGradientText}
                                    />
                                ) : undefined
                            }
                            label={isSubmitting ? "Saving..." : "Save"}
                            className="rounded-xl"
                            contentStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
                            textClassName="text-body-md font-semibold"
                        />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}
