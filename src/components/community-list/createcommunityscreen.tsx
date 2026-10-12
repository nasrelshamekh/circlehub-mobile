import { router } from "expo-router";
import { CirclePlus, Globe, LoaderCircle, Lock } from "lucide-react-native";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Field from "@/components/ui/formfield";
import GradientButton from "@/components/ui/gradientbutton";
import ImageUploadField from "@/components/ui/imageuploadfield";
import VisibilityOption from "@/components/ui/visibilityoption";
import { useTheme } from "@/context/themecontext";
import useCreateCommunity from "@/hooks/mutations/useCreateCommunity";
import { useCommunityCategories } from "@/hooks/useCommunityCategories";
import { UploadImage } from "@/lib/imageUpload";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

const DESCRIPTION_MAX = 500;

export default function CreateCommunityScreen() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const createCommunity = useCreateCommunity();
    const { categories } = useCommunityCategories();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [visibility, setVisibility] = useState<"public" | "private">("public");
    const [image, setImage] = useState<UploadImage | null>(null);
    const [coverImage, setCoverImage] = useState<UploadImage | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isSubmitting = createCommunity.isPending;

    function close() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    async function handleSubmit() {
        if (isSubmitting) return;

        const trimmedName = name.trim();
        const trimmedDescription = description.trim();

        if (trimmedName.length < 2) {
            setError("Community name must be at least 2 characters.");
            return;
        }

        if (!category) {
            setError("Please choose a category.");
            return;
        }

        if (trimmedDescription.length < 10) {
            setError("Description must be at least 10 characters.");
            return;
        }

        setError(null);

        try {
            await createCommunity.mutateAsync({
                name: trimmedName,
                category,
                description: trimmedDescription,
                visibility,
                image,
                coverImage,
            });

            close();
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : "Could not create the community."
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
                        Create Community
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
                    contentContainerClassName="gap-5 p-4 pb-8"
                    keyboardShouldPersistTaps="handled"
                >
                    <Text className="text-body-sm text-text-secondary">
                        Set up a space for people to join, share posts, and talk
                        about what they love.
                    </Text>

                    <Field label="Cover image">
                        <ImageUploadField
                            variant="cover"
                            previewUri={coverImage?.uri}
                            showRemove={Boolean(coverImage)}
                            onPicked={setCoverImage}
                            onError={setError}
                            onRemove={() => setCoverImage(null)}
                        />
                    </Field>

                    <Field label="Community image">
                        <ImageUploadField
                            variant="avatar"
                            previewUri={image?.uri}
                            showRemove={Boolean(image)}
                            onPicked={setImage}
                            onError={setError}
                            onRemove={() => setImage(null)}
                        />
                    </Field>

                    <Field label="Community name">
                        <TextInput
                            value={name}
                            onChangeText={(value) => {
                                setName(value);
                                setError(null);
                            }}
                            placeholder="e.g. Design Systems"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={80}
                            className="rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                        />
                    </Field>

                    <Field
                        label="Description"
                        hint={`${description.length}/${DESCRIPTION_MAX}`}
                    >
                        <TextInput
                            value={description}
                            onChangeText={(value) => {
                                setDescription(value);
                                setError(null);
                            }}
                            placeholder="Tell people what this community is about (min. 10 characters)."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            textAlignVertical="top"
                            maxLength={DESCRIPTION_MAX}
                            className="min-h-28 rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                        />
                    </Field>

                    <Field label="Category">
                        <View className="flex-row flex-wrap gap-2">
                            {categories.map((option) => {
                                const selected = option === category;

                                return (
                                    <Pressable
                                        key={option}
                                        onPress={() => {
                                            setCategory(option);
                                            setError(null);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                        accessibilityLabel={option}
                                        className={
                                            selected
                                                ? "rounded-full bg-active px-3 py-2"
                                                : "rounded-full border border-border bg-surface-lowest px-3 py-2"
                                        }
                                    >
                                        <Text
                                            className={
                                                selected
                                                    ? "text-label-sm font-semibold text-primary"
                                                    : "text-label-sm text-text-secondary"
                                            }
                                        >
                                            {option}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="Visibility">
                        <View className="flex-row gap-2">
                            <VisibilityOption
                                icon={Globe}
                                label="Public"
                                description="Anyone can join and see posts."
                                selected={visibility === "public"}
                                onPress={() => setVisibility("public")}
                            />
                            <VisibilityOption
                                icon={Lock}
                                label="Private"
                                description="People must request to join."
                                selected={visibility === "private"}
                                onPress={() => setVisibility("private")}
                            />
                        </View>
                    </Field>

                    {error ? (
                        <Text className="text-body-sm text-error">{error}</Text>
                    ) : null}

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
                        label={isSubmitting ? "Creating..." : "Create Community"}
                        className="rounded-xl"
                        contentStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
                        textClassName="text-body-md font-semibold"
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
