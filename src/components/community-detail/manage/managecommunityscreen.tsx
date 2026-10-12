import { router } from "expo-router";
import { Settings, ShieldCheck, UserPlus, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

import CommunityMembersManager from "@/components/community-detail/manage/communitymembersmanager";
import CommunityRequestsManager from "@/components/community-detail/manage/communityrequestsmanager";
import CommunitySettingsForm from "@/components/community-detail/manage/communitysettingsform";
import DeleteCommunityCard from "@/components/community-detail/manage/deletecommunitycard";
import ManageCommunitySkeleton from "@/components/skeletons/managecommunityskeleton";
import { useTheme } from "@/context/themecontext";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";
import { useCommunityMembers } from "@/hooks/useCommunityMembers";
import { useCommunityRequests } from "@/hooks/useCommunityRequests";
import { themeColors } from "@/theme/colors";

import type { LucideIcon } from "lucide-react-native";

type TabValue = "manage" | "members" | "requests";

const TAB_META: Record<TabValue, { label: string; icon: LucideIcon }> = {
    manage: { label: "Manage", icon: Settings },
    members: { label: "Members", icon: Users },
    requests: { label: "Requests", icon: UserPlus },
};

export default function ManageCommunityScreen({ slug }: { slug: string }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const { community, isLoading } = useCommunityDetails(slug);
    const { members, isLoading: isLoadingMembers } = useCommunityMembers(
        community?.id
    );
    const canManage =
        community?.communityRole === "admin" ||
        community?.communityRole === "moderator";
    const isAdmin = community?.communityRole === "admin";
    const { requests, isLoading: isLoadingRequests } = useCommunityRequests(
        canManage ? community?.id : undefined
    );

    const [selectedTab, setSelectedTab] = useState<TabValue | null>(null);
    const activeTab: TabValue = selectedTab ?? (isAdmin ? "manage" : "members");

    useEffect(() => {
        if (community && !canManage) {
            router.replace({ pathname: "/community/[slug]", params: { slug } });
        }
    }, [community, canManage, slug]);

    if (isLoading) {
        return <ManageCommunitySkeleton />;
    }

    if (!community || !canManage) {
        return (
            <View className="flex-1 items-center justify-center gap-2 p-10">
                <Text className="text-headline-md font-semibold text-text-primary">
                    You can&apos;t manage this community
                </Text>

                <Text className="text-center text-body-sm text-text-secondary">
                    Only the admin and moderators can manage this community.
                </Text>
            </View>
        );
    }

    const tabValues: TabValue[] = isAdmin
        ? ["manage", "members", "requests"]
        : ["members", "requests"];

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior="padding"
            keyboardVerticalOffset={16}
        >
            <ScrollView
                className="flex-1"
                contentContainerClassName="gap-4 p-4 pb-8"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View>
                    <Text className="text-headline-md font-bold text-text-primary">
                        Manage {community.name}
                    </Text>

                    <Text className="mt-1 text-body-sm text-text-secondary">
                        Edit community details, assign roles, and review pending join
                        requests.
                    </Text>
                </View>

                <View className="flex-row items-center gap-3 rounded-2xl bg-surface-lowest p-4">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-active">
                        <ShieldCheck size={20} color={colors.primary} />
                    </View>

                    <View className="flex-1">
                        <Text className="text-label-md font-semibold text-text-primary">
                            {isAdmin ? "Admin Access" : "Moderator Access"}
                        </Text>

                        <Text className="text-label-sm text-text-secondary">
                            {isAdmin
                                ? "You have full control over this community."
                                : "You can manage members and join requests."}
                        </Text>
                    </View>
                </View>

                <View className="flex-row rounded-2xl bg-surface-lowest p-1">
                    {tabValues.map((value) => {
                        const meta = TAB_META[value];
                        const Icon = meta.icon;
                        const selected = activeTab === value;

                        return (
                            <Pressable
                                key={value}
                                onPress={() => setSelectedTab(value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                accessibilityLabel={meta.label}
                                className={
                                    selected
                                        ? "flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-active py-2.5"
                                        : "flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5"
                                }
                            >
                                <Icon
                                    size={16}
                                    color={
                                        selected
                                            ? colors.primary
                                            : colors.textSecondary
                                    }
                                />

                                <Text
                                    className={
                                        selected
                                            ? "text-label-sm font-semibold text-primary"
                                            : "text-label-sm text-text-secondary"
                                    }
                                >
                                    {meta.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {activeTab === "manage" && isAdmin ? (
                    <View className="gap-4">
                        <CommunitySettingsForm community={community} />
                        <DeleteCommunityCard community={community} />
                    </View>
                ) : null}

                {activeTab === "members" ? (
                    <CommunityMembersManager
                        community={community}
                        members={members}
                        isLoading={isLoadingMembers}
                        viewerIsAdmin={Boolean(isAdmin)}
                    />
                ) : null}

                {activeTab === "requests" ? (
                    <CommunityRequestsManager
                        community={community}
                        requests={requests}
                        isLoading={isLoadingRequests}
                    />
                ) : null}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
