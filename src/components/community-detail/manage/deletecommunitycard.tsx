import { router } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import useDeleteCommunity from "@/hooks/mutations/useDeleteCommunity";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { CommunityDetails } from "@/types/community";

export default function DeleteCommunityCard({
    community,
}: {
    community: CommunityDetails;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const deleteCommunity = useDeleteCommunity();
    const [confirmation, setConfirmation] = useState("");

    const isConfirmed = confirmation.trim() === community.name;
    const isDeleting = deleteCommunity.isPending;

    async function handleDelete() {
        if (!isConfirmed || isDeleting) return;

        try {
            await deleteCommunity.mutateAsync(community.id);
            router.replace("/(tabs)/communities");
        } catch (caught) {
            Alert.alert(
                "Could not delete community",
                caught instanceof ApiError ? caught.message : "Please try again."
            );
        }
    }

    return (
        <View className="gap-4 rounded-2xl bg-surface-lowest p-4">
            <View>
                <Text className="text-title-lg font-semibold text-error">
                    Delete Community
                </Text>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    Deleting{" "}
                    <Text className="font-semibold text-primary">
                        {community.name}
                    </Text>{" "}
                    will permanently remove the community, its posts, members, and
                    requests. This action cannot be undone.
                </Text>
            </View>

            <View className="gap-2">
                <Text className="text-body-sm text-text-primary">
                    Type{" "}
                    <Text className="font-semibold text-error">
                        {community.name}
                    </Text>{" "}
                    to confirm
                </Text>

                <TextInput
                    value={confirmation}
                    onChangeText={setConfirmation}
                    placeholder={community.name}
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="rounded-xl border border-border bg-surface-low px-4 py-3 text-body-sm text-text-primary"
                />
            </View>

            <Pressable
                onPress={handleDelete}
                disabled={!isConfirmed || isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Delete community"
                className="flex-row items-center justify-center gap-2 self-start rounded-xl bg-error px-4 py-2.5"
                style={!isConfirmed || isDeleting ? { opacity: 0.6 } : undefined}
            >
                {isDeleting ? (
                    <ActivityIndicator size="small" color={colors.buttonGradientText} />
                ) : (
                    <Trash2 size={16} color={colors.buttonGradientText} />
                )}

                <Text
                    className="text-label-md font-semibold"
                    style={{ color: colors.buttonGradientText }}
                >
                    {isDeleting ? "Deleting..." : "Delete Community"}
                </Text>
            </Pressable>
        </View>
    );
}
