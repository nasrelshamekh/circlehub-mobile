import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { CalendarDays, LoaderCircle, Save } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import ProfileImagePicker from "@/components/profile/profileimagepicker";
import DatePicker, {
    formatDisplayDate,
    toApiDate,
} from "@/components/ui/datepicker";
import Field from "@/components/ui/formfield";
import GradientButton from "@/components/ui/gradientbutton";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useUpdateProfile from "@/hooks/mutations/useUpdateProfile";
import { getImageUrl } from "@/lib/imageUrl";
import {
    prepareUploadImage,
    UploadImage,
    uploadFailureMessage,
} from "@/lib/imageUpload";
import { themeColors } from "@/theme/colors";

function parseDateOfBirth(value: string | null): Date | null {
    if (!value) {
        return null;
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
        return null;
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

    return isNaN(date.getTime()) ? null : date;
}

const GENDERS = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
];

export default function EditProfileForm() {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const updateProfile = useUpdateProfile();

    const [name, setName] = useState(user?.name ?? "");
    const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
    const [location, setLocation] = useState(user?.location ?? "");
    const [website, setWebsite] = useState(user?.website ?? "");
    const [bio, setBio] = useState(user?.bio ?? "");
    const [skillsText, setSkillsText] = useState((user?.skills ?? []).join(", "));
    const [gender, setGender] = useState(user?.gender ?? "");
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(() =>
        parseDateOfBirth(user?.dateOfBirth ?? null)
    );
    const [avatarImage, setAvatarImage] = useState<UploadImage | null>(null);
    const [coverImage, setCoverImage] = useState<UploadImage | null>(null);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (!user) {
                return;
            }

            setName(user.name ?? "");
            setJobTitle(user.jobTitle ?? "");
            setLocation(user.location ?? "");
            setWebsite(user.website ?? "");
            setBio(user.bio ?? "");
            setSkillsText((user.skills ?? []).join(", "));
            setGender(user.gender ?? "");
            setDateOfBirth(parseDateOfBirth(user.dateOfBirth));
            setAvatarImage(null);
            setCoverImage(null);
            setError(null);
        }, [user])
    );

    if (!user) {
        return null;
    }

    const isSaving = updateProfile.isPending;
    const coverUri = coverImage?.uri ?? getImageUrl(user.coverImageUrl);
    const avatarUri = avatarImage?.uri ?? getImageUrl(user.avatarUrl);

    function close() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    async function pickImage(target: "avatar" | "cover") {
        setError(null);

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
        });

        if (result.canceled) return;

        const { image: picked, error: validationError } = await prepareUploadImage(
            result.assets[0]
        );

        if (validationError) {
            setError(validationError);
            return;
        }

        if (target === "avatar") {
            setAvatarImage(picked);
        } else {
            setCoverImage(picked);
        }
    }

    async function handleSubmit() {
        if (isSaving) return;

        const trimmedName = name.trim();

        if (trimmedName.length < 2) {
            setError("Please enter your full name (at least 2 characters).");
            return;
        }

        const trimmedLocation = location.trim();

        if (trimmedLocation && !/^[^,]+,\s*[^,]+$/.test(trimmedLocation)) {
            setError("Location must be in the format City, Country.");
            return;
        }

        const skills = skillsText
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean);

        setError(null);

        try {
            await updateProfile.mutateAsync({
                name: trimmedName,
                jobTitle: jobTitle.trim(),
                location: trimmedLocation,
                website: website.trim(),
                bio: bio.trim(),
                gender: gender || undefined,
                dateOfBirth: dateOfBirth ? toApiDate(dateOfBirth) : undefined,
                skills,
                avatarImage,
                coverImage,
            });

            close();
        } catch (caught) {
            setError(
                uploadFailureMessage(
                    caught,
                    Boolean(avatarImage || coverImage),
                    "Could not update your profile."
                )
            );
        }
    }

    return (
        <>
            <ProfileImagePicker
                name={user.name}
                avatarUri={avatarUri}
                coverUri={coverUri}
                onPickAvatar={() => pickImage("avatar")}
                onPickCover={() => pickImage("cover")}
            />

            <View className="gap-5 p-4">
                <Field label="Display name">
                    <TextInput
                        value={name}
                        onChangeText={(value) => {
                            setName(value);
                            setError(null);
                        }}
                        placeholder="Full name"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={80}
                        className="rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                    />
                </Field>

                <Field label="Username" hint="Can't be changed">
                    <TextInput
                        value={user.username}
                        editable={false}
                        className="rounded-xl border border-border bg-surface-high px-4 py-3 text-body-sm text-text-secondary"
                    />
                </Field>

                <Field label="Job title">
                    <TextInput
                        value={jobTitle}
                        onChangeText={(value) => {
                            setJobTitle(value);
                            setError(null);
                        }}
                        placeholder="Job title"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={120}
                        className="rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                    />
                </Field>

                <Field label="Location" hint="City, Country">
                    <TextInput
                        value={location}
                        onChangeText={(value) => {
                            setLocation(value);
                            setError(null);
                        }}
                        placeholder="e.g. Lagos, Nigeria"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={120}
                        className="rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                    />
                </Field>

                <Field label="Website">
                    <TextInput
                        value={website}
                        onChangeText={(value) => {
                            setWebsite(value);
                            setError(null);
                        }}
                        placeholder="https://example.com"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={200}
                        autoCapitalize="none"
                        keyboardType="url"
                        className="rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                    />
                </Field>

                <Field label="Date of birth">
                    <Pressable
                        onPress={() => setDatePickerOpen(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Select date of birth"
                        className="flex-row items-center justify-between rounded-xl border border-border bg-surface-lowest px-4 py-3"
                    >
                        <Text
                            className={
                                dateOfBirth
                                    ? "text-body-sm text-text-primary"
                                    : "text-body-sm text-text-secondary"
                            }
                        >
                            {dateOfBirth
                                ? formatDisplayDate(dateOfBirth)
                                : "DD-MM-YYYY"}
                        </Text>

                        <CalendarDays size={18} color={colors.textSecondary} />
                    </Pressable>
                </Field>

                <Field label="Gender">
                    <View className="flex-row flex-wrap gap-2">
                        {GENDERS.map((option) => {
                            const selected = option.value === gender;

                            return (
                                <Pressable
                                    key={option.value}
                                    onPress={() => {
                                        setGender(option.value);
                                        setError(null);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                    accessibilityLabel={option.label}
                                    className={
                                        selected
                                            ? "rounded-full bg-active px-4 py-2"
                                            : "rounded-full border border-border bg-surface-lowest px-4 py-2"
                                    }
                                >
                                    <Text
                                        className={
                                            selected
                                                ? "text-label-sm font-semibold text-primary"
                                                : "text-label-sm text-text-secondary"
                                        }
                                    >
                                        {option.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </Field>

                <Field
                    label="Skills & interests"
                    hint="Separate with commas"
                >
                    <TextInput
                        value={skillsText}
                        onChangeText={(value) => {
                            setSkillsText(value);
                            setError(null);
                        }}
                        placeholder="React, UI Design, Accessibility"
                        placeholderTextColor={colors.textSecondary}
                        className="rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                    />
                </Field>

                <Field label="Bio" hint={`${bio.length}/500`}>
                    <TextInput
                        value={bio}
                        onChangeText={(value) => {
                            setBio(value);
                            setError(null);
                        }}
                        placeholder="Tell people a little about yourself."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        textAlignVertical="top"
                        maxLength={500}
                        className="min-h-28 rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                    />
                </Field>

                {error ? (
                    <Text className="text-body-sm text-error">{error}</Text>
                ) : null}

                <GradientButton
                    onPress={handleSubmit}
                    disabled={isSaving}
                    icon={
                        isSaving ? (
                            <LoaderCircle
                                size={18}
                                color={colors.buttonGradientText}
                            />
                        ) : (
                            <Save
                                size={18}
                                color={colors.buttonGradientText}
                            />
                        )
                    }
                    label={isSaving ? "Saving..." : "Save Changes"}
                    className="rounded-xl"
                    contentStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
                    textClassName="text-body-md font-semibold"
                />
            </View>

            {datePickerOpen && (
                <DatePicker
                    value={dateOfBirth}
                    onConfirm={(date) => {
                        setDateOfBirth(date);
                        setError(null);
                        setDatePickerOpen(false);
                    }}
                    onClose={() => setDatePickerOpen(false)}
                />
            )}
        </>
    );
}
