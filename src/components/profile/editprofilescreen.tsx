import { router, useLocalSearchParams } from "expo-router";
import { Settings, UserRound } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
    KeyboardAvoidingView,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import ChangePasswordForm from "@/components/profile/changepasswordform";
import EditProfileForm from "@/components/profile/editprofileform";
import MessageRecoveryCard from "@/components/profile/messagerecoverycard";
import ProfileSettingsForm from "@/components/profile/profilesettingsform";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

type EditProfileTab = "profile" | "settings";

const TABS: { value: EditProfileTab; label: string; icon: LucideIcon }[] = [
    { value: "profile", label: "Profile", icon: UserRound },
    { value: "settings", label: "Settings", icon: Settings },
];

export default function EditProfileScreen() {
    const { tab } = useLocalSearchParams<{ tab?: string }>();
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const activeTab: EditProfileTab = tab === "settings" ? "settings" : "profile";

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior="padding"
            keyboardVerticalOffset={16}
        >
            <View className="px-4 py-3">
                <View className="flex-row rounded-2xl bg-surface-low p-1">
                    {TABS.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.value === activeTab;

                        return (
                            <Pressable
                                key={item.value}
                                onPress={() => router.setParams({ tab: item.value })}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isActive }}
                                accessibilityLabel={item.label}
                                className={
                                    isActive
                                        ? "flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-surface-lowest py-2.5"
                                        : "flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5"
                                }
                            >
                                <Icon
                                    size={16}
                                    color={
                                        isActive
                                            ? colors.primary
                                            : colors.textSecondary
                                    }
                                />

                                <Text
                                    className={
                                        isActive
                                            ? "text-label-md font-semibold text-primary"
                                            : "text-label-md text-text-secondary"
                                    }
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerClassName="pb-10"
                keyboardShouldPersistTaps="handled"
            >
                {activeTab === "profile" ? (
                    <>
                        <EditProfileForm />

                        <View className="px-4">
                            <ChangePasswordForm />
                        </View>
                    </>
                ) : (
                    <View className="px-4">
                        <ProfileSettingsForm />
                        <MessageRecoveryCard />
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
