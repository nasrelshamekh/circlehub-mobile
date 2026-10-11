import { Save } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import Field from "@/components/ui/formfield";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

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

// Appearance-only for now: mirrors the web Settings tab, which does not persist yet.
export default function ProfileSettingsForm() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const [profileVisibility, setProfileVisibility] = useState("public");
    const [messagesFrom, setMessagesFrom] = useState("followers");
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [communityUpdates, setCommunityUpdates] = useState(true);

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

            <GradientButton
                icon={<Save size={18} color={colors.buttonGradientText} />}
                label="Save Changes"
                className="rounded-xl"
                contentStyle={{ paddingVertical: 14 }}
                textClassName="text-body-md font-semibold"
            />
        </View>
    );
}
