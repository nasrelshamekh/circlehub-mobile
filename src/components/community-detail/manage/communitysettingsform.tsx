import { Globe, LoaderCircle, Lock, Save } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import Field from "@/components/ui/formfield";
import GradientButton from "@/components/ui/gradientbutton";
import ImageUploadField from "@/components/ui/imageuploadfield";
import VisibilityOption from "@/components/ui/visibilityoption";
import { useTheme } from "@/context/themecontext";
import useUpdateCommunity from "@/hooks/mutations/useUpdateCommunity";
import { useCommunityCategories } from "@/hooks/useCommunityCategories";
import { getImageUrl } from "@/lib/imageUrl";
import { UploadImage } from "@/lib/imageUpload";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { CommunityDetails } from "@/types/community";

export default function CommunitySettingsForm({
    community,
}: {
    community: CommunityDetails;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const updateCommunity = useUpdateCommunity();
    const { categories } = useCommunityCategories();

    const [name, setName] = useState(community.name);
    const [category, setCategory] = useState(community.category);
    const [visibility, setVisibility] = useState<"public" | "private">(
        community.visibility === "private" ? "private" : "public"
    );
    const [description, setDescription] = useState(community.description ?? "");
    const [image, setImage] = useState<UploadImage | null>(null);
    const [coverImage, setCoverImage] = useState<UploadImage | null>(null);

    const isSubmitting = updateCommunity.isPending;

    const coverPreview =
        coverImage?.uri ?? getImageUrl(community.coverImageUrl) ?? undefined;
    const imagePreview = image?.uri ?? getImageUrl(community.imageUrl) ?? undefined;

    async function handleSubmit() {
        if (isSubmitting) return;

        const trimmedName = name.trim();

        if (trimmedName.length < 2) {
            Alert.alert(
                "Community name too short",
                "Name must be at least 2 characters."
            );
            return;
        }

        if (!category) {
            Alert.alert("Category required", "Please choose a category.");
            return;
        }

        try {
            const response = await updateCommunity.mutateAsync({
                communityId: community.id,
                slug: community.slug,
                input: {
                    name: trimmedName,
                    category,
                    description: description.trim(),
                    visibility,
                    image,
                    coverImage,
                },
            });

            setImage(null);
            setCoverImage(null);
            Alert.alert("Community updated", response.message);
        } catch (caught) {
            Alert.alert(
                "Could not update community",
                caught instanceof ApiError ? caught.message : "Please try again."
            );
        }
    }

    return (
        <View className="gap-5 rounded-2xl bg-surface-lowest p-4">
            <View>
                <Text className="text-title-lg font-semibold text-text-primary">
                    Community Settings
                </Text>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    Update how your community appears to others.
                </Text>
            </View>

            <Field label="Cover image">
                <ImageUploadField
                    variant="cover"
                    previewUri={coverPreview}
                    showRemove={Boolean(coverImage)}
                    onPicked={setCoverImage}
                    onError={(message) => Alert.alert("Image not accepted", message)}
                    onRemove={() => setCoverImage(null)}
                />
            </Field>

            <Field label="Community image">
                <ImageUploadField
                    variant="avatar"
                    previewUri={imagePreview}
                    showRemove={Boolean(image)}
                    onPicked={setImage}
                    onError={(message) => Alert.alert("Image not accepted", message)}
                    onRemove={() => setImage(null)}
                />
            </Field>

            <Field label="Community name">
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Design Systems"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={80}
                    className="rounded-xl border border-border bg-surface-low px-4 py-3 text-body-sm text-text-primary"
                />
            </Field>

            <Field label="Slug">
                <View className="rounded-xl border border-border bg-surface-low px-4 py-3">
                    <Text className="text-body-sm text-text-secondary">
                        {community.slug}
                    </Text>
                </View>
            </Field>

            <Field label="Category">
                <View className="flex-row flex-wrap gap-2">
                    {categories.map((option) => {
                        const selected = option === category;

                        return (
                            <Pressable
                                key={option}
                                onPress={() => setCategory(option)}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                accessibilityLabel={option}
                                className={
                                    selected
                                        ? "rounded-full bg-active px-3 py-2"
                                        : "rounded-full border border-border bg-surface-low px-3 py-2"
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

            <Field label="Description">
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Tell people what this community is about."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    textAlignVertical="top"
                    maxLength={500}
                    className="min-h-28 rounded-xl border border-border bg-surface-low px-4 py-3 text-body-sm text-text-primary"
                />
            </Field>

            <GradientButton
                onPress={handleSubmit}
                disabled={isSubmitting}
                icon={
                    isSubmitting ? (
                        <LoaderCircle size={18} color={colors.buttonGradientText} />
                    ) : (
                        <Save size={18} color={colors.buttonGradientText} />
                    )
                }
                label={isSubmitting ? "Saving..." : "Save Changes"}
                className="rounded-xl"
                contentStyle={{ paddingVertical: 14 }}
                textClassName="text-body-md font-semibold"
            />
        </View>
    );
}
