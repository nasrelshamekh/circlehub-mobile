import { router } from "expo-router";
import {
    Check,
    Clock,
    FileText,
    Hash,
    Lock,
    Network,
    ShieldUser,
    Users,
} from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import GradientButton from "@/components/ui/gradientbutton";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useToggleCommunityMembership from "@/hooks/mutations/useToggleCommunityMembership";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { CommunityListItem } from "@/types/community";

import type { LucideIcon } from "lucide-react-native";

export default function CommunityResultCard({
    community,
}: {
    community: CommunityListItem;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const { user } = useAuth();
    const toggleMembership = useToggleCommunityMembership();

    const isAdmin =
        community.viewerRole === "admin" || community.admin.id === user?.id;
    const isJoined = community.membershipStatus === "joined";
    const isRequested = community.membershipStatus === "requested";
    const isPrivate = community.visibility === "private";
    const actionLabel = isJoined
        ? "Leave"
        : isRequested
          ? "Requested"
          : isPrivate
            ? "Request"
            : "Join";

    const statusLabel = isAdmin
        ? "Managed by you"
        : isJoined
          ? "You're a member"
          : isRequested
            ? "Waiting for approval"
            : isPrivate
              ? "Approval required"
              : "Open community";

    function openCommunity() {
        router.push({
            pathname: "/community/[slug]",
            params: { slug: community.slug },
        });
    }

    function openAdminProfile() {
        router.push({
            pathname: "/profile/[username]",
            params: { username: community.admin.username },
        });
    }

    function handleMembership() {
        if (toggleMembership.isPending) return;

        toggleMembership.mutate({ community });
    }

    return (
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm gap-3">
            <View className="flex-row items-start gap-4">
                <Pressable
                    onPress={openCommunity}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${community.name}`}
                    hitSlop={4}
                >
                    <CommunityThumb community={community} />
                </Pressable>

                <View className="min-w-0 flex-1">
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

                        <View className="rounded-full bg-active px-3 py-1">
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
                </View>
            </View>

            {community.description ? (
                <Text
                    numberOfLines={2}
                    className="text-body-sm text-text-secondary"
                >
                    {community.description}
                </Text>
            ) : null}

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

            <Pressable
                onPress={openAdminProfile}
                accessibilityRole="button"
                accessibilityLabel={`View ${community.admin.name}'s profile`}
                className="flex-row items-center gap-2 rounded-lg bg-surface-low px-3 py-2"
            >
                <Avatar
                    src={community.admin.avatarUrl}
                    name={community.admin.name}
                    className="h-8 w-8"
                />

                <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                        <ShieldUser size={14} color={colors.textSecondary} />
                        <Text className="text-label-sm font-semibold text-text-primary">
                            Admin
                        </Text>
                    </View>

                    <Text
                        numberOfLines={1}
                        className="text-label-sm text-text-secondary"
                    >
                        {community.admin.name}
                        {community.admin.jobTitle
                            ? ` • ${community.admin.jobTitle}`
                            : ""}
                    </Text>
                </View>
            </Pressable>

            <View className="flex-row items-center justify-between gap-3 border-t border-border pt-3">
                <Text className="flex-1 text-label-sm text-text-secondary">
                    {statusLabel}
                </Text>

                {isAdmin ? (
                    <Pressable
                        onPress={openCommunity}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${community.name}`}
                        className="rounded-xl bg-surface-low px-4 py-2"
                    >
                        <Text className="text-label-sm font-medium text-text-secondary">
                            Open
                        </Text>
                    </Pressable>
                ) : isJoined || isRequested ? (
                    <Pressable
                        onPress={handleMembership}
                        disabled={toggleMembership.isPending}
                        accessibilityRole="button"
                        accessibilityLabel={
                            isJoined
                                ? `Leave ${community.name}`
                                : `Cancel request to join ${community.name}`
                        }
                        className="flex-row items-center gap-2 rounded-xl bg-surface-low px-4 py-2"
                        style={
                            toggleMembership.isPending
                                ? { opacity: 0.6 }
                                : undefined
                        }
                    >
                        {isJoined ? (
                            <Check size={15} color={colors.textSecondary} />
                        ) : (
                            <Clock size={15} color={colors.textSecondary} />
                        )}

                        <Text
                            className={
                                isJoined
                                    ? "text-label-sm font-medium text-error"
                                    : "text-label-sm font-medium text-text-secondary"
                            }
                        >
                            {actionLabel}
                        </Text>
                    </Pressable>
                ) : (
                    <GradientButton
                        onPress={handleMembership}
                        disabled={toggleMembership.isPending}
                        label={actionLabel}
                        accessibilityLabel={`${actionLabel} ${community.name}`}
                        className="rounded-xl"
                        contentStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                        textClassName="text-label-sm font-semibold"
                    />
                )}
            </View>
        </View>
    );
}

function CommunityThumb({ community }: { community: CommunityListItem }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const uri = getImageUrl(community.imageUrl);

    if (uri) {
        return (
            <Image
                source={{ uri }}
                className="h-20 w-20 rounded-lg"
                resizeMode="cover"
            />
        );
    }

    return (
        <View className="h-20 w-20 items-center justify-center rounded-lg bg-surface-high">
            <Network size={28} color={colors.textSecondary} />
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
