import { router } from "expo-router";
import {
    Check,
    Clock,
    FileText,
    Hash,
    Lock,
    Network,
    Shield,
    ShieldUser,
    Users,
} from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { CommunityListItem } from "@/types/community";

import type { LucideIcon } from "lucide-react-native";

export default function CommunityCard({
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

    const isAdmin = community.viewerRole === "admin";
    const isModerator = community.viewerRole === "moderator";
    const isRequested = community.membershipStatus === "requested";
    const isPrivate = community.visibility === "private";

    const roleLabel = isAdmin ? "Admin" : isModerator ? "Moderator" : null;
    const RoleIcon = isAdmin ? ShieldUser : Shield;

    const coverUri = getImageUrl(community.coverImageUrl || community.imageUrl);

    function openCommunity() {
        router.push({
            pathname: "/community/[slug]",
            params: { slug: community.slug },
        });
    }

    return (
        <View className="overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
            <Pressable
                onPress={openCommunity}
                accessibilityRole="button"
                accessibilityLabel={`Open ${community.name}`}
            >
                <View className="h-36 w-full bg-surface-high">
                    {coverUri ? (
                        <ExpoImage
                            source={{ uri: coverUri }}
                            className="h-full w-full"
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={150}
                        />
                    ) : (
                        <View className="h-full w-full items-center justify-center">
                            <Network size={36} color={colors.textSecondary} />
                        </View>
                    )}
                </View>
            </Pressable>

            <View className="p-4 gap-4">
                <View>
                    <View className="flex-row items-start justify-between gap-3">
                        <Pressable
                            onPress={openCommunity}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${community.name}`}
                            className="min-w-0 flex-1"
                        >
                            <Text
                                numberOfLines={1}
                                className="text-body-md font-semibold text-text-primary"
                            >
                                {community.name}
                            </Text>
                        </Pressable>

                        <View className="shrink-0 items-end gap-2">
                            <View className="rounded-full bg-active px-3 py-1">
                                <Text className="text-label-sm text-primary">
                                    {community.category}
                                </Text>
                            </View>

                            {roleLabel ? (
                                <View className="flex-row items-center gap-1.5 rounded-full bg-surface-low px-3 py-1">
                                    <RoleIcon size={14} color={colors.textPrimary} />
                                    <Text className="text-label-sm text-primary">
                                        {roleLabel}
                                    </Text>
                                </View>
                            ) : null}
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
                </View>

                <Text
                    numberOfLines={2}
                    className="text-body-sm text-text-secondary"
                >
                    {community.description}
                </Text>

                <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
                    <Meta
                        icon={Users}
                        label={`${community.membersCount.toLocaleString()} members`}
                    />
                    <Meta
                        icon={FileText}
                        label={`${community.postsCount.toLocaleString()} posts`}
                    />
                    <Meta
                        icon={isPrivate ? Lock : Hash}
                        label={isPrivate ? "Private" : "Public"}
                    />
                </View>

                <View className="flex-row items-center justify-between gap-3 border-t border-border pt-3">
                    <View className="flex-row items-center gap-1.5">
                        {isRequested ? (
                            <Clock size={15} color={colors.textSecondary} />
                        ) : (
                            <Check size={15} color={colors.textSecondary} />
                        )}
                        <Text className="text-label-sm text-text-secondary">
                            {isRequested
                                ? "Request pending"
                                : (roleLabel ?? "Member")}
                        </Text>
                    </View>

                    {!isAdmin ? (
                        <Pressable
                            onPress={() => onMembershipChange(community)}
                            disabled={isPending}
                            accessibilityRole="button"
                            accessibilityLabel={
                                isRequested
                                    ? `Cancel request to join ${community.name}`
                                    : `Leave ${community.name}`
                            }
                            className="rounded-xl bg-surface-low px-4 py-2"
                            style={isPending ? { opacity: 0.6 } : undefined}
                        >
                            <Text className="text-label-sm font-medium text-error">
                                {isRequested ? "Cancel" : "Leave"}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

function Meta({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="flex-row items-center gap-1.5">
            <Icon size={15} color={colors.textSecondary} />
            <Text className="text-label-sm text-text-secondary">{label}</Text>
        </View>
    );
}
