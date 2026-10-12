import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { CirclePlus, Images, LoaderCircle, X } from "lucide-react-native";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Avatar from "@/components/avatar";
import GradientButton from "@/components/ui/gradientbutton";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useCreatePost from "@/hooks/mutations/useCreatePost";
import { imageFromAsset, UploadImage, validateUploadImage } from "@/lib/imageUpload";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

export default function Create() {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const createPost = useCreatePost();

    // When opened from a community, the post is scoped to that community.
    const { communityId, communityName } = useLocalSearchParams<{
        communityId?: string;
        communityName?: string;
    }>();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [content, setContent] = useState("");
    const [image, setImage] = useState<UploadImage | null>(null);
    const [error, setError] = useState<string | null>(null);

    const firstName = user?.name.split(" ")[0];
    const isSubmitting = createPost.isPending;

    // Return to the tab underneath, or the feed when deep-linked with nothing to pop.
    function close() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    // Close the composer and land on the Home feed so the new post is visible,
    // no matter which tab the composer was opened from.
    function showInFeed() {
        if (router.canDismiss()) {
            router.dismissAll();
        }

        router.navigate("/(tabs)");
    }

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

        if (!trimmed && !image) {
            setError("Please write something or add a photo first.");
            return;
        }

        setError(null);

        try {
            await createPost.mutateAsync({
                content: trimmed,
                image,
                communityId,
            });

            setContent("");
            setImage(null);

            if (communityId) {
                // Community posts stay in their own community feed.
                close();
            } else {
                // Public posts always land in the Home feed.
                showInFeed();
            }
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : "Could not create the post."
            );
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low" edges={["top", "bottom"]}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior="padding"
                keyboardVerticalOffset={16}
            >
                <View className="flex-row items-center justify-between px-4 py-3">
                    <Text className="text-title-lg font-semibold text-text-primary">
                        {communityId ? "Create Community Post" : "Create Post"}
                    </Text>

                    <Pressable
                        onPress={close}
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
                    <Text className="text-body-sm text-text-secondary">
                        {communityName
                            ? `Share an update, thought, or photo with ${communityName}.`
                            : "Share an update, thought, or photo with your CircleHub community."}
                    </Text>

                    <View className="flex-row items-center gap-3">
                        <Avatar
                            src={user?.avatarUrl}
                            name={user?.name ?? ""}
                            className="h-12 w-12"
                        />

                        <View>
                            <Text className="text-label-md font-semibold text-text-primary">
                                {user?.name}
                            </Text>

                            <Text className="text-label-sm text-text-secondary">
                                {communityName
                                    ? `Posting to ${communityName}`
                                    : "Posting publicly"}
                            </Text>
                        </View>
                    </View>

                    <TextInput
                        value={content}
                        onChangeText={(value) => {
                            setContent(value);
                            setError(null);
                        }}
                        placeholder={
                            firstName
                                ? `What's on your mind, ${firstName}?`
                                : "What's on your mind?"
                        }
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        textAlignVertical="top"
                        maxLength={5000}
                        className="min-h-36 rounded-xl border border-border bg-surface-lowest p-4 text-body-md text-text-primary"
                    />

                    {image && (
                        <View className="overflow-hidden rounded-xl">
                            <Image
                                source={{ uri: image.uri }}
                                className="w-full h-[260px]"
                                resizeMode="cover"
                            />

                            <Pressable
                                onPress={() => setImage(null)}
                                accessibilityLabel="Remove selected photo"
                                className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-surface-lowest"
                            >
                                <X size={18} color={colors.textPrimary} />
                            </Pressable>
                        </View>
                    )}

                    {error && (
                        <Text className="text-body-sm text-error">{error}</Text>
                    )}

                    <View className="flex-row items-center justify-between">
                        <Text className="text-label-md text-text-secondary">
                            Add to your post:
                        </Text>

                        <Pressable
                            onPress={pickImage}
                            accessibilityLabel="Add photo"
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
                            ) : (
                                <CirclePlus
                                    size={20}
                                    color={colors.buttonGradientText}
                                />
                            )
                        }
                        label={isSubmitting ? "Posting..." : "Post"}
                        className="rounded-xl"
                        contentStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
                        textClassName="text-body-md font-semibold"
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}