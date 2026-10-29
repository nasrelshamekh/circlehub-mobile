import { router } from "expo-router";
import {
    Shield,
    ShieldUser,
    UserMinus,
    UserRound,
} from "lucide-react-native";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import Skeleton from "@/components/ui/skeleton";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useRemoveCommunityMember from "@/hooks/mutations/useRemoveCommunityMember";
import useUpdateCommunityMemberRole from "@/hooks/mutations/useUpdateCommunityMemberRole";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { CommunityDetails, CommunityMember } from "@/types/community";

const ROLE_LABEL: Record<string, string> = {
    member: "Member",
    moderator: "Moderator",
};

export default function CommunityMembersManager({
    community,
    members,
    isLoading,
    viewerIsAdmin,
}: {
    community: CommunityDetails;
    members: CommunityMember[];
    isLoading: boolean;
    viewerIsAdmin: boolean;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const { user } = useAuth();

    const removeMember = useRemoveCommunityMember();
    const updateRole = useUpdateCommunityMemberRole();

    function openProfile(username: string) {
        router.push({ pathname: "/profile/[username]", params: { username } });
    }

    function applyRole(member: CommunityMember, role: "member" | "moderator") {
        if ((member.communityRole || "member") === role) return;

        updateRole
            .mutateAsync({
                communityId: community.id,
                membershipId: member.membershipId,
                role,
            })
            .catch((caught) => {
                Alert.alert(
                    "Could not change role",
                    caught instanceof ApiError ? caught.message : "Please try again."
                );
            });
    }

    function changeRole(member: CommunityMember) {
        const current = member.communityRole || "member";

        Alert.alert(
            "Change role",
            `${member.name} is currently a ${
                ROLE_LABEL[current] ?? "Member"
            }. Choose a new role.`,
            [
                { text: "Make member", onPress: () => applyRole(member, "member") },
                {
                    text: "Make moderator",
                    onPress: () => applyRole(member, "moderator"),
                },
            ]
        );
    }

    function confirmRemove(member: CommunityMember) {
        Alert.alert(
            "Remove member",
            `Remove ${member.name} from ${community.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                        removeMember
                            .mutateAsync({
                                communityId: community.id,
                                membershipId: member.membershipId,
                                communitySlug: community.slug,
                            })
                            .catch((caught) => {
                                Alert.alert(
                                    "Could not remove member",
                                    caught instanceof ApiError
                                        ? caught.message
                                        : "Please try again."
                                );
                            });
                    },
                },
            ]
        );
    }

    return (
        <View className="gap-4 rounded-2xl bg-surface-lowest p-4">
            <View>
                <Text className="text-title-lg font-semibold text-text-primary">
                    Members &amp; Roles
                </Text>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    Review members and assign moderation roles.
                </Text>
            </View>

            {isLoading ? (
                <View className="gap-3">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </View>
            ) : members.length === 0 ? (
                <View className="items-center rounded-xl bg-surface-low px-4 py-10">
                    <Text className="text-title-lg text-text-primary">
                        No members yet
                    </Text>
                </View>
            ) : (
                <View className="gap-3">
                    {members.map((member) => {
                        const isAdmin =
                            member.communityRole === "admin" ||
                            member.username === community.admin.username;
                        const memberRole = member.communityRole || "member";
                        const isModerator = memberRole === "moderator";
                        const isSelf = member.id === user?.id;
                        const canRemove =
                            !isAdmin && !isSelf && (viewerIsAdmin || !isModerator);
                        const isRemoving =
                            removeMember.isPending &&
                            removeMember.variables?.membershipId ===
                                member.membershipId;
                        const isChangingRole =
                            updateRole.isPending &&
                            updateRole.variables?.membershipId ===
                                member.membershipId;

                        return (
                            <View
                                key={member.membershipId}
                                className="gap-3 rounded-xl bg-surface-low p-3"
                            >
                                <Pressable
                                    onPress={() => openProfile(member.username)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`View ${member.name}'s profile`}
                                    className="flex-row items-center gap-3"
                                >
                                    <Avatar
                                        src={member.avatarUrl}
                                        name={member.name}
                                        className="h-11 w-11"
                                    />

                                    <View className="min-w-0 flex-1">
                                        <Text
                                            numberOfLines={1}
                                            className="text-label-md text-text-primary"
                                        >
                                            {member.name}
                                        </Text>

                                        {member.jobTitle ? (
                                            <Text
                                                numberOfLines={1}
                                                className="text-label-sm text-text-secondary"
                                            >
                                                {member.jobTitle}
                                            </Text>
                                        ) : null}
                                    </View>
                                </Pressable>

                                {isAdmin ? (
                                    <View className="flex-row items-center gap-1.5 self-start rounded-full bg-active px-3 py-1.5">
                                        <ShieldUser
                                            size={15}
                                            color={colors.primary}
                                        />
                                        <Text className="text-label-sm text-primary">
                                            Admin
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="flex-row items-center justify-between gap-2">
                                        <View className="flex-row items-center gap-2">
                                            {isModerator ? (
                                                <Shield
                                                    size={18}
                                                    color={colors.primary}
                                                />
                                            ) : (
                                                <UserRound
                                                    size={18}
                                                    color={colors.primary}
                                                />
                                            )}

                                            {viewerIsAdmin ? (
                                                <Pressable
                                                    onPress={() =>
                                                        changeRole(member)
                                                    }
                                                    disabled={isChangingRole}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Change role for ${
                                                        member.name
                                                    }. Currently ${
                                                        ROLE_LABEL[memberRole] ??
                                                        "Member"
                                                    }`}
                                                    className="flex-row items-center gap-2 rounded-lg bg-surface px-3 py-1.5"
                                                >
                                                    <Text className="text-label-sm text-text-primary">
                                                        {ROLE_LABEL[memberRole] ??
                                                            "Member"}
                                                    </Text>

                                                    {isChangingRole ? (
                                                        <ActivityIndicator
                                                            size="small"
                                                            color={colors.primary}
                                                        />
                                                    ) : null}
                                                </Pressable>
                                            ) : (
                                                <Text className="px-2 text-label-sm text-primary">
                                                    {ROLE_LABEL[memberRole] ??
                                                        "Member"}
                                                </Text>
                                            )}
                                        </View>

                                        {canRemove ? (
                                            <Pressable
                                                onPress={() =>
                                                    confirmRemove(member)
                                                }
                                                disabled={isRemoving}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Remove ${member.name}`}
                                                className="flex-row items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5"
                                                style={
                                                    isRemoving
                                                        ? { opacity: 0.6 }
                                                        : undefined
                                                }
                                            >
                                                {isRemoving ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={
                                                            colors.textSecondary
                                                        }
                                                    />
                                                ) : (
                                                    <UserMinus
                                                        size={15}
                                                        color={
                                                            colors.textSecondary
                                                        }
                                                    />
                                                )}

                                                <Text className="text-label-sm text-error">
                                                    {isRemoving
                                                        ? "Removing..."
                                                        : "Remove"}
                                                </Text>
                                            </Pressable>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}
