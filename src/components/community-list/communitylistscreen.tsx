import { router } from "expo-router";
import { CirclePlus, Compass, ShieldUser, Users } from "lucide-react-native";
import { ReactNode, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import CommunityCard from "@/components/community-list/communitycard";
import SuggestedCommunityCard from "@/components/community-list/suggestedcommunitycard";
import CommunitiesListSkeleton from "@/components/skeletons/communitieslistskeleton";
import EmptyState from "@/components/ui/emptystate";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import useToggleCommunityMembership from "@/hooks/mutations/useToggleCommunityMembership";
import { useCommunities } from "@/hooks/useCommunities";
import { themeColors } from "@/theme/colors";
import { CommunityListItem } from "@/types/community";

const SUGGESTED_PREVIEW_COUNT = 3;

export default function CommunityListScreen() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const { communities, isLoading } = useCommunities();
    const toggleMembership = useToggleCommunityMembership();
    const [showAllSuggestions, setShowAllSuggestions] = useState(false);

    const managedCommunities = communities.filter(
        (community) =>
            community.viewerRole === "admin" ||
            community.viewerRole === "moderator"
    );
    const joinedCommunities = communities.filter(
        (community) =>
            community.viewerRole === "member" ||
            community.membershipStatus === "requested"
    );
    const suggestedCommunities = communities.filter(
        (community) => community.membershipStatus === "not_joined"
    );

    const visibleSuggestions = showAllSuggestions
        ? suggestedCommunities
        : suggestedCommunities.slice(0, SUGGESTED_PREVIEW_COUNT);

    const isPending = toggleMembership.isPending;

    function handleMembershipChange(community: CommunityListItem) {
        if (isPending) return;

        toggleMembership.mutate({ community });
    }

    if (isLoading) {
        return <CommunitiesListSkeleton />;
    }

    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="gap-6 p-4 pb-8"
            showsVerticalScrollIndicator={false}
        >
            <View className="flex-row items-start justify-between gap-4">
                <Text className="min-w-0 flex-1 text-body-sm text-text-secondary">
                    Keep up with the communities you joined and discover new
                    ones.
                </Text>

                <GradientButton
                    onPress={() => router.push("/create-community")}
                    icon={
                        <CirclePlus size={18} color={colors.buttonGradientText} />
                    }
                    label="Create"
                    accessibilityLabel="Create a community"
                    className="rounded-full"
                    contentStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                    textClassName="text-label-md font-semibold"
                />
            </View>

            <Section
                title="Communities You Manage"
                description="Communities where you are an admin or moderator."
                count={managedCommunities.length}
            >
                {managedCommunities.length > 0 ? (
                    managedCommunities.map((community) => (
                        <CommunityCard
                            key={community.id}
                            community={community}
                            isPending={isPending}
                            onMembershipChange={handleMembershipChange}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon={ShieldUser}
                        title="Nothing to manage yet"
                        subtitle="Communities you create or moderate will appear here."
                    />
                )}
            </Section>

            <Section
                title="Your Communities"
                description="Communities you joined or are waiting to join."
                count={joinedCommunities.length}
            >
                {joinedCommunities.length > 0 ? (
                    joinedCommunities.map((community) => (
                        <CommunityCard
                            key={community.id}
                            community={community}
                            isPending={isPending}
                            onMembershipChange={handleMembershipChange}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon={Users}
                        title="No communities yet"
                        subtitle="Join a public community or request access to a private one from the suggestions below."
                    />
                )}
            </Section>

            <Section
                title="Suggested Communities"
                description="Public communities you can join, and private ones you can request."
                count={suggestedCommunities.length}
            >
                {visibleSuggestions.length > 0 ? (
                    visibleSuggestions.map((community) => (
                        <SuggestedCommunityCard
                            key={community.id}
                            community={community}
                            isPending={isPending}
                            onMembershipChange={handleMembershipChange}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon={Compass}
                        title="No suggestions right now"
                        subtitle="You've joined every community available to you."
                    />
                )}

                {suggestedCommunities.length > SUGGESTED_PREVIEW_COUNT ? (
                    <Pressable
                        onPress={() => setShowAllSuggestions((current) => !current)}
                        accessibilityRole="button"
                        accessibilityLabel={
                            showAllSuggestions
                                ? "Show fewer suggestions"
                                : "Show all suggestions"
                        }
                        className="self-center rounded-full bg-surface-lowest px-4 py-2"
                    >
                        <Text className="text-label-sm font-medium text-primary">
                            {showAllSuggestions
                                ? "Show fewer"
                                : `Show all ${suggestedCommunities.length}`}
                        </Text>
                    </Pressable>
                ) : null}
            </Section>
        </ScrollView>
    );
}

function Section({
    title,
    description,
    count,
    children,
}: {
    title: string;
    description: string;
    count: number;
    children: ReactNode;
}) {
    return (
        <View className="gap-4">
            <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                    <Text className="text-title-lg font-semibold text-text-primary">
                        {title}
                    </Text>
                    <Text className="mt-1 text-body-sm text-text-secondary">
                        {description}
                    </Text>
                </View>

                <View className="rounded-full bg-active px-3 py-1">
                    <Text className="text-label-sm font-medium text-primary">
                        {count}
                    </Text>
                </View>
            </View>

            <View className="gap-3">{children}</View>
        </View>
    );
}
