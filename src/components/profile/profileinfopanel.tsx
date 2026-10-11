import {
    ChevronDown,
    ChevronUp,
    Link as LinkIcon,
    MapPin,
    Network,
    Shield,
    ShieldUser,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import { useTheme } from "@/context/themecontext";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { UserCommunity } from "@/types/community";
import { FollowUser, UserProfile } from "@/types/user";

const CONNECTIONS_PREVIEW_LIMIT = 5;

function PanelCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <Text className="text-title-lg font-semibold text-text-primary">
                {title}
            </Text>
            {children}
        </View>
    );
}

export default function ProfileInfoPanels({
    user,
    connections = [],
    connectionsTitle = "Your Connections",
    communities = [],
}: {
    user: UserProfile;
    connections?: FollowUser[];
    connectionsTitle?: string;
    communities?: UserCommunity[];
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const [showAllConnections, setShowAllConnections] = useState(false);

    const skills = user.skills ?? [];
    const previewConnections = connections.slice(0, CONNECTIONS_PREVIEW_LIMIT);
    const extraConnections = connections.slice(CONNECTIONS_PREVIEW_LIMIT);
    const hasMoreConnections = connections.length > CONNECTIONS_PREVIEW_LIMIT;
    const visibleConnections = showAllConnections ? connections : previewConnections;

    return (
        <View className="gap-4">
            <PanelCard title="Skills & Interests">
                {skills.length > 0 ? (
                    <View className="mt-4 flex-row flex-wrap gap-2">
                        {skills.map((skill) => (
                            <View
                                key={skill}
                                className="rounded-full bg-active px-3 py-1.5"
                            >
                                <Text className="text-label-sm text-primary">
                                    {skill}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text className="mt-4 text-body-sm text-text-secondary">
                        No skills or interests added yet.
                    </Text>
                )}

                <View className="mt-5 gap-3">
                    {user.location ? (
                        <View className="flex-row items-center gap-2">
                            <MapPin size={16} color={colors.textSecondary} />
                            <Text className="text-body-sm text-text-secondary">
                                {user.location}
                            </Text>
                        </View>
                    ) : null}

                    <View className="flex-row items-center gap-2">
                        <LinkIcon size={16} color={colors.textSecondary} />
                        <Text className="text-body-sm text-text-secondary">
                            circlehub.dev/{user.username}
                        </Text>
                    </View>
                </View>
            </PanelCard>

            <PanelCard title={connectionsTitle}>
                {connections.length > 0 ? (
                    <View className="mt-4">
                        <View className="flex-row items-center gap-4">
                            <View className="flex-row">
                                {visibleConnections.map((connection, index) => (
                                    <Pressable
                                        key={connection.id}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/profile/[username]",
                                                params: {
                                                    username:
                                                        connection.username,
                                                },
                                            })
                                        }
                                        style={
                                            index > 0
                                                ? { marginLeft: -12 }
                                                : undefined
                                        }
                                    >
                                        <Avatar
                                            src={connection.avatarUrl}
                                            name={connection.name}
                                            className="h-10 w-10"
                                        />
                                    </Pressable>
                                ))}
                            </View>

                            <Text className="text-body-sm text-primary">
                                {connections.length}{" "}
                                {connections.length === 1
                                    ? "connection"
                                    : "connections"}
                            </Text>
                        </View>

                        {hasMoreConnections && (
                            <View className="mt-3 flex-row flex-wrap gap-2">
                                {showAllConnections
                                    ? extraConnections.map((connection) => (
                                        <Pressable
                                            key={connection.id}
                                            onPress={() =>
                                                router.push({
                                                    pathname:
                                                        "/profile/[username]",
                                                    params: {
                                                        username:
                                                            connection.username,
                                                    },
                                                })
                                            }
                                        >
                                            <Avatar
                                                src={connection.avatarUrl}
                                                name={connection.name}
                                                className="h-10 w-10"
                                            />
                                        </Pressable>
                                    ))
                                    : null}
                            </View>
                        )}

                        {hasMoreConnections && (
                            <Pressable
                                onPress={() =>
                                    setShowAllConnections((isShowingAll) => !isShowingAll)
                                }
                                className="mt-3 flex-row items-center gap-1"
                            >
                                <Text className="text-label-sm text-primary">
                                    {showAllConnections
                                        ? "Show less"
                                        : `Show ${extraConnections.length} more`}
                                </Text>
                                {showAllConnections ? (
                                    <ChevronUp size={14} color={colors.primary} />
                                ) : (
                                    <ChevronDown size={14} color={colors.primary} />
                                )}
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <Text className="mt-4 text-body-sm text-text-secondary">
                        No connections to show yet.
                    </Text>
                )}
            </PanelCard>

            <PanelCard title="Communities">
                {communities.length > 0 ? (
                    <View className="mt-4 gap-3">
                        {communities.map((community) => (
                            <CommunityRow key={community.id} community={community} />
                        ))}
                    </View>
                ) : (
                    <View className="mt-4 items-center rounded-xl bg-surface-low px-4 py-8">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-active">
                            <Network size={22} color={colors.primary} />
                        </View>
                        <Text className="text-label-md text-text-primary">
                            No communities yet
                        </Text>
                        <Text className="mt-2 text-center text-body-sm text-text-secondary">
                            Communities joined by this user will appear here.
                        </Text>
                    </View>
                )}
            </PanelCard>
        </View>
    );
}

function CommunityRow({ community }: { community: UserCommunity }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const isAdmin = community.userRole === "admin";
    const isModerator = community.userRole === "moderator";

    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/community/[slug]",
                    params: { slug: community.slug },
                })
            }
            accessibilityRole="button"
            accessibilityLabel={`Open ${community.name}`}
            className="flex-row items-center gap-3"
        >
            {community.imageUrl || community.coverImageUrl ? (
                <Image
                    source={{
                        uri: getImageUrl(
                            community.coverImageUrl || community.imageUrl
                        )!,
                    }}
                    className="h-11 w-11 rounded-lg"
                    resizeMode="cover"
                />
            ) : (
                <View className="h-11 w-11 items-center justify-center rounded-lg bg-surface-high">
                    <Text className="text-label-md text-text-secondary">
                        {community.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}

            <View className="flex-1">
                <Text className="text-body-md font-semibold text-text-primary">
                    {community.name}
                </Text>
                <Text className="text-label-sm text-text-secondary">
                    {community.category}
                </Text>
            </View>

            {isAdmin || isModerator ? (
                <View className="flex-row items-center gap-1.5 rounded-full bg-surface-low px-3 py-1">
                    {isAdmin ? (
                        <ShieldUser size={14} color={colors.primary} />
                    ) : (
                        <Shield size={14} color={colors.primary} />
                    )}
                    <Text className="text-label-sm text-primary">
                        {isAdmin ? "Admin" : "Moderator"}
                    </Text>
                </View>
            ) : null}
        </Pressable>
    );
}
