import {
    Check,
    Clock,
    FileText,
    Hash,
    Lock,
    Network,
    Settings,
    Users,
} from "lucide-react-native";
import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { CommunityDetails } from "@/types/community";

export default function CommunityHeader({
    community,
    isPending,
    onMembershipChange,
}: {
    community: CommunityDetails;
    isPending: boolean;
    onMembershipChange: () => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const isAdmin = community.communityRole === "admin";
    const isJoined = community.membershipStatus === "joined";
    const isRequested = community.membershipStatus === "requested";
    const isPrivate = community.visibility === "private";
    const canManage = isAdmin || community.communityRole === "moderator";

    const coverUri = getImageUrl(community.coverImageUrl || community.imageUrl);
    const imageUri = getImageUrl(community.imageUrl);

    function openManage() {
        router.push({
            pathname: "/community-manage",
            params: { slug: community.slug },
        });
    }

    return (
        <View>
            <View className="mx-4 mt-2 h-40 overflow-hidden rounded-2xl bg-surface-high">
                {coverUri ? (
                    <Image
                        source={{ uri: coverUri }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="h-full w-full items-center justify-center">
                        <Network size={40} color={colors.textSecondary} />
                    </View>
                )}
            </View>

            <View className="-mt-10 mx-4 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <View className="flex-row items-center gap-4">
                    <View className="h-24 w-24 overflow-hidden rounded-xl border-4 border-surface-lowest bg-surface-high">
                        {imageUri ? (
                            <Image
                                source={{ uri: imageUri }}
                                className="h-full w-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="h-full w-full items-center justify-center">
                                <Text className="text-title-lg font-semibold text-text-secondary">
                                    {community.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className="min-w-0 flex-1">
                        <View className="flex-row flex-wrap items-center gap-2">
                            <Text
                                numberOfLines={2}
                                className="text-headline-md font-bold text-text-primary"
                            >
                                {community.name}
                            </Text>

                            <View className="rounded-full bg-active px-3 py-1">
                                <Text className="text-label-sm text-primary">
                                    {community.category}
                                </Text>
                            </View>
                        </View>

                        <View className="mt-1 flex-row items-center gap-1.5">
                            <Hash size={15} color={colors.textSecondary} />
                            <Text
                                numberOfLines={1}
                                className="flex-1 text-body-sm text-text-secondary"
                            >
                                {community.slug}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mt-4 flex-row gap-2">
                    {isAdmin ? (
                        <View className="flex-1 items-center justify-center rounded-xl bg-surface-low py-2.5">
                            <Text className="text-label-md font-semibold text-text-secondary">
                                You&apos;re the admin
                            </Text>
                        </View>
                    ) : isJoined ? (
                        <Pressable
                            onPress={onMembershipChange}
                            disabled={isPending}
                            accessibilityRole="button"
                            accessibilityLabel={`Leave ${community.name}`}
                            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-surface-low py-2.5"
                            style={isPending ? { opacity: 0.6 } : undefined}
                        >
                            <Check size={16} color={colors.textSecondary} />
                            <Text className="text-label-md font-semibold text-error">
                                Leave
                            </Text>
                        </Pressable>
                    ) : isRequested ? (
                        <Pressable
                            onPress={onMembershipChange}
                            disabled={isPending}
                            accessibilityRole="button"
                            accessibilityLabel={`Cancel request to join ${community.name}`}
                            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-surface-low py-2.5"
                            style={isPending ? { opacity: 0.6 } : undefined}
                        >
                            <Clock size={16} color={colors.textSecondary} />
                            <Text className="text-label-md font-semibold text-text-secondary">
                                Requested
                            </Text>
                        </Pressable>
                    ) : (
                        <GradientButton
                            onPress={onMembershipChange}
                            disabled={isPending}
                            label={isPrivate ? "Request" : "Join"}
                            accessibilityLabel={`${
                                isPrivate ? "Request to join" : "Join"
                            } ${community.name}`}
                            className="flex-1 rounded-xl"
                            contentStyle={{ paddingVertical: 10 }}
                            textClassName="text-label-md font-semibold"
                        />
                    )}
                </View>

                {canManage ? (
                    <Pressable
                        onPress={openManage}
                        accessibilityRole="button"
                        accessibilityLabel={`Manage ${community.name}`}
                        className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-active py-2.5"
                    >
                        <Settings size={16} color={colors.primary} />
                        <Text className="text-label-md font-semibold text-primary">
                            Manage Community
                        </Text>
                    </Pressable>
                ) : null}

                {community.description ? (
                    <Text className="mt-4 text-body-sm text-text-secondary">
                        {community.description}
                    </Text>
                ) : null}

                <View className="mt-4 flex-row flex-wrap items-center gap-x-5 gap-y-2">
                    <View className="flex-row items-center gap-1.5">
                        <Users size={16} color={colors.textSecondary} />
                        <Text className="text-body-sm text-text-secondary">
                            {community.membersCount} members
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                        <FileText size={16} color={colors.textSecondary} />
                        <Text className="text-body-sm text-text-secondary">
                            {community.postsCount} posts
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                        {isPrivate ? (
                            <Lock size={16} color={colors.textSecondary} />
                        ) : (
                            <Hash size={16} color={colors.textSecondary} />
                        )}
                        <Text className="text-body-sm text-text-secondary">
                            {isPrivate ? "Private community" : "Public community"}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
