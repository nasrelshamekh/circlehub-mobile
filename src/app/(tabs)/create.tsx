import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { CirclePlus, Images, LoaderCircle, X } from "lucide-react-native";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createPost } from "@/api/posts";
import Avatar from "@/components/avatar";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import {
    imageFromAsset,
    UploadImage,
    validateUploadImage,
} from "@/lib/imageUpload";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

export default function Create() {
    const { isDark } = useTheme();
    const { user } = useAuth();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [content, setContent] = useState("");
    const [image, setImage] = useState<UploadImage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const firstName = user?.name.split(" ")[0];

    async function pickImage() {
        setError(null);

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
        });

        if (result.canceled) {
            return;
        }

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
        if (submitting) {
            return;
        }

        const trimmed = content.trim();

        if (!trimmed && !image) {
            setError("Please write something or add a photo first.");
            return;
        }

        setError(null);
        setSubmitting(true);

        try {
            await createPost(trimmed, image);

            setContent("");
            setImage(null);

            // Land on the feed, which re-fetches on focus and shows the new post.
            router.navigate("/(tabs)");
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : "Could not create the post."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low" edges={["top"]}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="gap-4 p-4"
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="gap-1">
                        <Text className="text-title-lg font-semibold text-text-primary">
                            Create Post
                        </Text>

                        <Text className="text-body-sm text-text-secondary">
                            Share an update, thought, or photo with your
                            CircleHub community.
                        </Text>
                    </View>

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
                                Posting publicly
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
                                style={{ width: "100%", height: 260 }}
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

                    <Pressable
                        onPress={handleSubmit}
                        disabled={submitting}
                        className="overflow-hidden rounded-xl"
                    >
                        <LinearGradient
                            colors={[
                                colors.primaryGradientStart,
                                colors.primaryGradientEnd,
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                paddingHorizontal: 20,
                                paddingVertical: 16,
                                opacity: submitting ? 0.6 : 1,
                            }}
                        >
                            {submitting ? (
                                <LoaderCircle
                                    size={18}
                                    color={colors.buttonGradientText}
                                />
                            ) : (
                                <CirclePlus
                                    size={20}
                                    color={colors.buttonGradientText}
                                />
                            )}

                            <Text
                                className="text-body-md font-semibold"
                                style={{ color: colors.buttonGradientText }}
                            >
                                {submitting ? "Posting..." : "Post"}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
