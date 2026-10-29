import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
    BarChart2,
    CirclePlus,
    Images,
    LoaderCircle,
    Plus,
    Trash2,
    X,
} from "lucide-react-native";
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
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useCreatePost from "@/hooks/mutations/useCreatePost";
import { requestFeedScrollToTop } from "@/lib/feedScroll";
import { prepareUploadImage, UploadImage, uploadFailureMessage } from "@/lib/imageUpload";
import { themeColors } from "@/theme/colors";

export default function Create() {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const createPost = useCreatePost();

    const { communityId, communityName } = useLocalSearchParams<{
        communityId?: string;
        communityName?: string;
    }>();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [content, setContent] = useState("");
    const [images, setImages] = useState<UploadImage[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Poll State
    const [showPoll, setShowPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
    const [pollDurationDays, setPollDurationDays] = useState(3);

    const firstName = user?.name.split(" ")[0];
    const isSubmitting = createPost.isPending;

    function close() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    function showInFeed() {
        requestFeedScrollToTop();

        if (router.canDismiss()) {
            router.dismissAll();
        }

        router.navigate("/(tabs)");
    }

    async function pickImages() {
        setError(null);

        const remainingLimit = 4 - images.length;
        if (remainingLimit <= 0) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            allowsMultipleSelection: true,
            selectionLimit: remainingLimit,
        });

        if (result.canceled || !result.assets) return;

        const preparedList: UploadImage[] = [];
        for (const asset of result.assets) {
            const { image: picked, error: validationError } = await prepareUploadImage(
                asset
            );

            if (validationError) {
                setError(validationError);
                return;
            }

            if (picked) {
                preparedList.push(picked);
            }
        }

        setImages((prev) => [...prev, ...preparedList].slice(0, 4));
    }

    function removeImage(index: number) {
        setImages((prev) => prev.filter((_, idx) => idx !== index));
    }

    function addPollOption() {
        if (pollOptions.length >= 6) return;
        setPollOptions((prev) => [...prev, ""]);
    }

    function updatePollOption(text: string, index: number) {
        setPollOptions((prev) => {
            const next = [...prev];
            next[index] = text;
            return next;
        });
    }

    function removePollOption(index: number) {
        if (pollOptions.length <= 2) return;
        setPollOptions((prev) => prev.filter((_, idx) => idx !== index));
    }

    async function handleSubmit() {
        if (isSubmitting) return;

        const trimmed = content.trim();

        if (showPoll) {
            const validOptions = pollOptions.map((opt) => opt.trim()).filter(Boolean);
            if (validOptions.length < 2) {
                setError("Please provide at least 2 poll options.");
                return;
            }
        }

        if (!trimmed && images.length === 0 && !showPoll) {
            setError("Please write something, add a photo, or create a poll.");
            return;
        }

        setError(null);

        try {
            const validOptions = pollOptions.map((opt) => opt.trim()).filter(Boolean);
            await createPost.mutateAsync({
                content: trimmed,
                images: images.length > 0 ? images : undefined,
                image: images.length === 1 ? images[0] : undefined,
                poll: showPoll
                    ? {
                          question: pollQuestion.trim() || trimmed,
                          options: validOptions,
                          durationDays: pollDurationDays,
                      }
                    : null,
                communityId,
            });

            setContent("");
            setImages([]);
            setShowPoll(false);
            setPollOptions(["", ""]);
            setPollQuestion("");

            if (communityId) {
                close();
            } else {
                showInFeed();
            }
        } catch (caught) {
            setError(
                uploadFailureMessage(
                    caught,
                    images.length > 0,
                    "Could not create the post."
                )
            );
        }
    }

    return (
        <Modal visible animationType="slide" onRequestClose={close}>
            <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
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
                            accessibilityLabel="Close"
                            hitSlop={8}
                            className="h-9 w-9 items-center justify-center rounded-full bg-surface-lowest"
                        >
                            <X size={18} color={colors.textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="gap-3 px-4 pb-10"
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
                            className="min-h-32 rounded-xl border border-border bg-surface-lowest p-4 text-body-md text-text-primary"
                        />

                        {/* Images Preview */}
                        {images.length > 0 && (
                            <View className="gap-2">
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerClassName="gap-2.5 py-1"
                                >
                                    {images.map((img, index) => (
                                        <View
                                            key={index}
                                            className="relative h-28 w-28 overflow-hidden rounded-xl border border-border"
                                        >
                                            <Image
                                                source={{ uri: img.uri }}
                                                className="h-full w-full"
                                                resizeMode="cover"
                                            />
                                            <Pressable
                                                onPress={() => removeImage(index)}
                                                accessibilityLabel={`Remove photo ${index + 1}`}
                                                className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/70"
                                            >
                                                <X size={14} color="#ffffff" />
                                            </Pressable>
                                        </View>
                                    ))}
                                    {images.length < 4 && (
                                        <Pressable
                                            onPress={pickImages}
                                            accessibilityLabel="Add more photos"
                                            className="h-28 w-28 items-center justify-center rounded-xl border border-dashed border-border bg-surface-low active:bg-surface-lowest"
                                        >
                                            <Plus size={22} color={colors.textSecondary} />
                                            <Text className="mt-1 text-label-xs text-text-secondary">
                                                Add photo
                                            </Text>
                                        </Pressable>
                                    )}
                                </ScrollView>
                            </View>
                        )}

                        {/* Poll Creator Section */}
                        {showPoll && (
                            <View className="gap-3 rounded-2xl border border-border bg-surface-lowest p-4">
                                <View className="flex-row items-center justify-between border-b border-border/50 pb-2">
                                    <View className="flex-row items-center gap-2">
                                        <BarChart2 size={18} color={colors.primary} />
                                        <Text className="text-label-md font-semibold text-text-primary">
                                            Community Poll
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => setShowPoll(false)}
                                        accessibilityLabel="Discard poll"
                                        className="h-7 w-7 items-center justify-center rounded-full bg-surface-low"
                                    >
                                        <X size={15} color={colors.textSecondary} />
                                    </Pressable>
                                </View>

                                <TextInput
                                    value={pollQuestion}
                                    onChangeText={(v) => {
                                        setPollQuestion(v);
                                        setError(null);
                                    }}
                                    placeholder="Ask a question (optional if in post)..."
                                    placeholderTextColor={colors.textSecondary}
                                    className="rounded-xl border border-border bg-surface-low px-3.5 py-2.5 text-body-sm text-text-primary"
                                />

                                <View className="gap-2">
                                    {pollOptions.map((opt, idx) => (
                                        <View key={idx} className="flex-row items-center gap-2">
                                            <TextInput
                                                value={opt}
                                                onChangeText={(v) => {
                                                    updatePollOption(v, idx);
                                                    setError(null);
                                                }}
                                                placeholder={`Option ${idx + 1}`}
                                                placeholderTextColor={colors.textSecondary}
                                                className="flex-1 rounded-xl border border-border bg-surface-low px-3.5 py-2.5 text-body-sm text-text-primary"
                                            />
                                            {pollOptions.length > 2 && (
                                                <Pressable
                                                    onPress={() => removePollOption(idx)}
                                                    accessibilityLabel={`Remove option ${idx + 1}`}
                                                    className="h-9 w-9 items-center justify-center rounded-lg bg-surface-low"
                                                >
                                                    <Trash2
                                                        size={16}
                                                        color={colors.error || "#ef4444"}
                                                    />
                                                </Pressable>
                                            )}
                                        </View>
                                    ))}
                                </View>

                                {pollOptions.length < 6 && (
                                    <Pressable
                                        onPress={addPollOption}
                                        className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5"
                                    >
                                        <Plus size={16} color={colors.primary} />
                                        <Text className="text-label-sm font-semibold text-primary">
                                            Add option ({pollOptions.length}/6)
                                        </Text>
                                    </Pressable>
                                )}

                                {/* Poll Duration Selector */}
                                <View className="flex-row items-center justify-between pt-1">
                                    <Text className="text-label-xs text-text-secondary">
                                        Poll duration:
                                    </Text>
                                    <View className="flex-row gap-1.5">
                                        {[1, 3, 7].map((days) => (
                                            <Pressable
                                                key={days}
                                                onPress={() => setPollDurationDays(days)}
                                                className={`rounded-lg px-2.5 py-1 ${
                                                    pollDurationDays === days
                                                        ? "bg-primary"
                                                        : "bg-surface-low"
                                                }`}
                                            >
                                                <Text
                                                    className={`text-label-xs font-medium ${
                                                        pollDurationDays === days
                                                            ? "text-white"
                                                            : "text-text-secondary"
                                                    }`}
                                                >
                                                    {days} {days === 1 ? "day" : "days"}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {error && (
                            <Text className="text-body-sm text-error">{error}</Text>
                        )}

                        {/* Bottom Actions Row */}
                        <View className="flex-row items-center justify-between pt-1">
                            <Text className="text-label-md text-text-secondary">
                                Add to your post:
                            </Text>

                            <View className="flex-row items-center gap-2">
                                <Pressable
                                    onPress={pickImages}
                                    disabled={images.length >= 4}
                                    accessibilityLabel="Add photo"
                                    className="h-10 flex-row items-center gap-1.5 rounded-full border border-border bg-surface-lowest px-3.5"
                                >
                                    <Images
                                        size={20}
                                        color={
                                            images.length >= 4
                                                ? colors.textSecondary
                                                : colors.primary
                                        }
                                    />
                                    {images.length > 0 && (
                                        <Text className="text-label-xs font-semibold text-text-primary">
                                            {images.length}/4
                                        </Text>
                                    )}
                                </Pressable>

                                <Pressable
                                    onPress={() => setShowPoll((prev) => !prev)}
                                    accessibilityLabel={
                                        showPoll ? "Discard poll" : "Add poll"
                                    }
                                    className={`h-10 flex-row items-center gap-1.5 rounded-full border px-3.5 ${
                                        showPoll
                                            ? "border-primary bg-primary/10"
                                            : "border-border bg-surface-lowest"
                                    }`}
                                >
                                    <BarChart2
                                        size={20}
                                        color={
                                            showPoll
                                                ? colors.primary
                                                : colors.textSecondary
                                        }
                                    />
                                    <Text
                                        className={`text-label-xs font-semibold ${
                                            showPoll
                                                ? "text-primary"
                                                : "text-text-secondary"
                                        }`}
                                    >
                                        Poll
                                    </Text>
                                </Pressable>
                            </View>
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
        </Modal>
    );
}
