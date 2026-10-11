import { router } from "expo-router";
import { FileText, Hash, Lock, Network, Users } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { CommunityListItem } from "@/types/community";

export default function SuggestedCommunityCard({
    community,
    isPending,
    onMembershipChange,
}: {
    community: CommunityListItem;
    isPending: boolean;
    onMembershipChange: (community: CommunityListItem) => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const isPrivate = community.visibility === "private";
    const thumbUri = getImageUrl(community.imageUrl || community.coverImageUrl);

    function openCommunity() {
        router.push({
            pathname: "/community/[slug]",
            params: { slug: community.slug },
        });
    }

    return (
        <View className="rounded-2xl bg-surface-lowest p-4 gap-3">
            <Pressable
                onPress={openCommunity}
                accessibilityRole="button"
                accessibilityLabel={`Open ${community.name}`}
                className="flex-row items-start gap-3"
            >
                {thumbUri ? (
                    <Image
                        source={{ uri: thumbUri }}
                        className="h-16 w-16 rounded-lg"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-lg bg-surface-high">
                        <Network size={24} color={colors.textSecondary} />
                    </View>
                )}

                <View className="min-w-0 flex-1">
                    <View className="flex-row items-start justify-between gap-2">
                        <Text
                            numberOfLines={1}
                            className="min-w-0 flex-1 text-label-md font-semibold text-text-primary"
                        >
                            {community.name}
                        </Text>

                        <View className="shrink-0 rounded-full bg-active px-2.5 py-1">
                            <Text className="text-label-sm text-primary">
                                {community.category}
                            </Text>
                        </View>
                    </View>

                    <View className="mt-1 flex-row items-center gap-1.5">
                        <Hash size={14} color={colors.textSecondary} />
                        <Text
                            numberOfLines={1}
                            className="flex-1 text-label-sm text-text-secondary"
                        >
                            {community.slug}
                        </Text>
                    </View>

                    <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1">
                        <View className="flex-row items-center gap-1.5">
                            <Users size={14} color={colors.textSecondary} />
                            <Text className="text-label-sm text-text-secondary">
                                {community.membersCount.toLocaleString()}
                            </Text>
                        </View>

                        <View className="flex-row items-center gap-1.5">
                            <FileText size={14} color={colors.textSecondary} />
                            <Text className="text-label-sm text-text-secondary">
                                {community.postsCount.toLocaleString()}
                            </Text>
                        </View>

                        <View className="flex-row items-center gap-1.5">
                            {isPrivate ? (
                                <Lock size={14} color={colors.textSecondary} />
                            ) : (
                                <Hash size={14} color={colors.textSecondary} />
                            )}
                            <Text className="text-label-sm text-text-secondary">
                                {isPrivate ? "Private" : "Public"}
                            </Text>
                        </View>
                    </View>
                </View>
            </Pressable>

            {community.description ? (
                <Text
                    numberOfLines={2}
                    className="text-label-sm text-text-secondary"
                >
                    {community.description}
                </Text>
            ) : null}

            <GradientButton
                onPress={() => onMembershipChange(community)}
                disabled={isPending}
                label={isPrivate ? "Request" : "Join"}
                accessibilityLabel={`${isPrivate ? "Request to join" : "Join"} ${community.name}`}
                className="rounded-xl"
                contentStyle={{ paddingVertical: 10 }}
                textClassName="text-label-md font-semibold"
            />
        </View>
    );
}
