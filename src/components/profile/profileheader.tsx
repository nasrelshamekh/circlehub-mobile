import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
    CalendarDays,
    MapPin,
    MessageCircle,
    Pencil,
    Settings,
} from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    Text,
    View,
} from "react-native";

import { getOrCreateConversation } from "@/api/messages";
import Avatar from "@/components/avatar";
import FollowButton from "@/components/followers/followbutton";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { getImageUrl } from "@/lib/imageUrl";
import { queryKeys } from "@/lib/queryKeys";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { UserProfile } from "@/types/user";

export default function ProfileHeader({ user }: { user: UserProfile }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const queryClient = useQueryClient();
    const [isStartingChat, setIsStartingChat] = useState(false);

    const isFollowedByMe = Boolean(user.isFollowedByMe);
    const messagesFrom = (user.messagesFrom || "followers").toLowerCase();
    const canMessage = typeof user.canMessage === "boolean"
        ? (messagesFrom === "followers" ? isFollowedByMe : user.canMessage)
        : (messagesFrom === "everyone" || (messagesFrom === "followers" && isFollowedByMe));

    const joined = new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    function openNetwork(tab: "followers" | "following") {
        if (user.isCurrentUser) {
            router.navigate({
                pathname: "/(tabs)/followers",
                params: { tab },
            });
        } else {
            router.push({
                pathname: "/followers/[username]",
                params: { username: user.username, tab },
            });
        }
    }

    async function handleMessagePress() {
        if (!canMessage) {
            Alert.alert(
                "Cannot Message User",
                messagesFrom === "none"
                    ? "This user is not accepting messages."
                    : messagesFrom === "followers"
                    ? "Only followers can send messages to this user. Follow them first to message."
                    : "You cannot send messages to this user based on their privacy settings."
            );
            return;
        }

        if (isStartingChat) return;

        try {
            setIsStartingChat(true);
            const res = await getOrCreateConversation({
                recipientId: user.id,
                recipientUsername: user.username,
            });

            const conversationId = res.data?.conversationId;
            if (conversationId) {
                void queryClient.invalidateQueries({
                    queryKey: queryKeys.conversations(),
                });
                router.push({
                    pathname: "/messages/[id]",
                    params: {
                        id: conversationId,
                        name: user.name,
                        username: user.username,
                        avatarUrl: user.avatarUrl ?? "",
                    },
                });
            }
        } catch (err: unknown) {
            const error = err as ApiError;
            Alert.alert(
                "Error",
                error?.message || "Failed to start conversation"
            );
        } finally {
            setIsStartingChat(false);
        }
    }

    return (
        <View>
            <View className="relative h-56 w-full">
                {user.coverImageUrl ? (
                    <Image
                        source={{ uri: getImageUrl(user.coverImageUrl)! }}
                        className="h-full w-full rounded-lg"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="h-full w-full bg-surface-high" />
                )}
                <View className="absolute inset-0 bg-black/25" />
            </View>

            <View className="mx-4 -mt-8 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <Avatar
                    src={user.avatarUrl}
                    name={user.name}
                    className="h-24 w-24"
                    textClassName="text-headline-lg"
                />

                <View className="mt-2 flex-row items-center gap-2">
                    <Text className="text-headline-lg font-bold text-text-primary">
                        {user.name}
                    </Text>
                    {!user.isCurrentUser && user.followsMe && (
                        <View className="rounded-full bg-surface-low px-3 py-1">
                            <Text className="text-label-sm text-primary">
                                Follows you
                            </Text>
                        </View>
                    )}
                </View>

                <Text className="mt-0.5 text-body-sm text-text-secondary">
                    @{user.username}
                    {user.jobTitle ? `  •  ${user.jobTitle}` : ""}
                </Text>

                {user.isCurrentUser ? (
                    <View className="mt-4 flex-row gap-2">
                        <Pressable
                            onPress={() =>
                                router.navigate({
                                    pathname: "/edit-profile",
                                    params: { tab: "settings" },
                                })
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Profile settings"
                            className="h-10 w-10 items-center justify-center rounded-xl bg-surface-low"
                        >
                            <Settings size={18} color={colors.textPrimary} />
                        </Pressable>

                        <GradientButton
                            onPress={() =>
                                router.navigate({
                                    pathname: "/edit-profile",
                                    params: { tab: "profile" },
                                })
                            }
                            icon={
                                <Pencil
                                    size={16}
                                    color={colors.buttonGradientText}
                                />
                            }
                            label="Edit Profile"
                            className="flex-1 rounded-xl"
                            contentStyle={{ minHeight: 40, paddingHorizontal: 16 }}
                            textClassName="text-label-md font-semibold"
                        />
                    </View>
                ) : (
                    <View className="mt-4 flex-row gap-2">
                        <FollowButton user={user} variant="text" />

                        <Pressable
                            onPress={handleMessagePress}
                            disabled={isStartingChat}
                            accessibilityRole="button"
                            accessibilityLabel={
                                canMessage
                                    ? `Message ${user.name}`
                                    : `Cannot message ${user.name}`
                            }
                            className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-surface-low px-4 py-2 ${
                                !canMessage ? "opacity-50" : ""
                            }`}
                            style={{ minHeight: 40 }}
                        >
                            {isStartingChat ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.textPrimary}
                                />
                            ) : (
                                <>
                                    <MessageCircle
                                        size={16}
                                        color={colors.textPrimary}
                                    />
                                    <Text className="text-label-md font-semibold text-text-primary">
                                        Message
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                )}

                {user.bio ? (
                    <Text className="mt-2 text-body-sm text-text-secondary">
                        {user.bio}
                    </Text>
                ) : null}

                <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
                    {user.location ? (
                        <View className="flex-row items-center gap-1.5">
                            <MapPin size={14} color={colors.textSecondary} />
                            <Text className="text-body-sm text-text-secondary">
                                {user.location}
                            </Text>
                        </View>
                    ) : null}

                    <View className="flex-row items-center gap-1.5">
                        <CalendarDays size={14} color={colors.textSecondary} />
                        <Text className="text-body-sm text-text-secondary">
                            Joined {joined}
                        </Text>
                    </View>
                </View>

                <View className="mt-4 flex-row gap-8">
                    <View>
                        <Text className="text-label-md font-bold text-text-primary">
                            {user.postsCount}
                        </Text>
                        <Text className="text-body-sm text-text-secondary">
                            Posts
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => openNetwork("followers")}
                        accessibilityRole="button"
                        accessibilityLabel={`View followers. ${user.followersCount}`}
                    >
                        <Text className="text-label-md font-bold text-text-primary">
                            {user.followersCount}
                        </Text>
                        <Text className="text-body-sm text-text-secondary">
                            Followers
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => openNetwork("following")}
                        accessibilityRole="button"
                        accessibilityLabel={`View following. ${user.followingCount}`}
                    >
                        <Text className="text-label-md font-bold text-text-primary">
                            {user.followingCount}
                        </Text>
                        <Text className="text-body-sm text-text-secondary">
                            Following
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
