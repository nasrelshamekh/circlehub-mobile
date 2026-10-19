import { useFocusEffect } from "expo-router";
import { Save } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";

import Field from "@/components/ui/formfield";
import FormError from "@/components/ui/formerror";
import GradientButton from "@/components/ui/gradientbutton";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useUpdateSettings from "@/hooks/mutations/useUpdateSettings";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

const profileVisibilityOptions = [
    { value: "public", label: "Public" },
    { value: "followers", label: "Followers only" },
    { value: "private", label: "Private" },
];

const messagesFromOptions = [
    { value: "everyone", label: "Everyone" },
    { value: "followers", label: "Followers only" },
    { value: "none", label: "No one" },
];

function OptionChips({
    options,
    value,
    onChange,
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <View className="flex-row flex-wrap gap-2">
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
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
    );
}

function ToggleRow({
    title,
    description,
    value,
    onValueChange,
}: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="flex-row items-center justify-between gap-4 rounded-xl bg-surface-low p-4">
            <View className="flex-1">
                <Text className="text-label-md font-semibold text-text-primary">
                    {title}
                </Text>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    {description}
                </Text>
            </View>

            <Switch
                value={value}
                onValueChange={onValueChange}
                accessibilityLabel={title}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
                thumbColor={colors.surface}
            />
        </View>
    );
}

export default function ProfileSettingsForm() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const { user } = useAuth();
    const updateSettings = useUpdateSettings();

    const [profileVisibility, setProfileVisibility] = useState(
        user?.profileVisibility ?? "public"
    );
    const [messagesFrom, setMessagesFrom] = useState(
        user?.messagesFrom ?? "followers"
    );
    const [emailNotifications, setEmailNotifications] = useState(
        user?.emailNotifications ?? true
    );
    const [communityUpdates, setCommunityUpdates] = useState(
        user?.communityUpdates ?? true
    );
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (!user) return;

            setProfileVisibility(user.profileVisibility ?? "public");
            setMessagesFrom(user.messagesFrom ?? "followers");
            setEmailNotifications(user.emailNotifications ?? true);
            setCommunityUpdates(user.communityUpdates ?? true);
            setError(null);
        }, [user])
    );

    async function handleSave() {
        if (updateSettings.isPending) return;

        setError(null);

        try {
            await updateSettings.mutateAsync({
                profileVisibility,
                messagesFrom,
                emailNotifications,
                communityUpdates,
            });

            Alert.alert(
                "Settings saved",
                "Your preferences have been updated."
            );
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : "Could not save your settings."
            );
        }
    }

    return (
        <View className="gap-6 rounded-2xl bg-surface-lowest p-4">
            <View>
                <Text className="text-title-lg font-semibold text-text-primary">
                    Profile Settings
                </Text>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    Manage privacy, messages, and notification preferences.
                </Text>
            </View>

            <Field label="Profile visibility">
                <OptionChips
                    options={profileVisibilityOptions}
                    value={profileVisibility}
                    onChange={setProfileVisibility}
                />
            </Field>

            <Field label="Messages from">
                <OptionChips
                    options={messagesFromOptions}
                    value={messagesFrom}
                    onChange={setMessagesFrom}
                />
            </Field>

            <View className="gap-3">
                <ToggleRow
                    title="Email Notifications"
                    description="Receive important account and activity updates by email."
                    value={emailNotifications}
                    onValueChange={setEmailNotifications}
                />

                <ToggleRow
                    title="Community Updates"
                    description="Receive updates from communities you joined or manage."
                    value={communityUpdates}
                    onValueChange={setCommunityUpdates}
                />
            </View>

            {error ? <FormError message={error} /> : null}

            <GradientButton
                onPress={handleSave}
                disabled={updateSettings.isPending}
                icon={<Save size={18} color={colors.buttonGradientText} />}
                label={updateSettings.isPending ? "Saving..." : "Save Changes"}
                className="rounded-xl"
                contentStyle={{ paddingVertical: 14 }}
                textClassName="text-body-md font-semibold"
            />
        </View>
    );
}
