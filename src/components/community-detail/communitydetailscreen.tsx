import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import CommunityHeader from "@/components/community-detail/communityheader";
import CommunityTabs from "@/components/community-detail/communitytabs";
import CommunityDetailsSkeleton from "@/components/skeletons/communitydetailsskeleton";
import GradientButton from "@/components/ui/gradientbutton";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";
import { useCommunityMembers } from "@/hooks/useCommunityMembers";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import useToggleCommunityMembership from "@/hooks/mutations/useToggleCommunityMembership";

export default function CommunityDetailsScreen({ slug }: { slug: string }) {
    const { community, isLoading } = useCommunityDetails(slug);
    const { posts, isLoading: isLoadingPosts } = useCommunityPosts(community?.id);
    const { members, isLoading: isLoadingMembers } = useCommunityMembers(
        community?.id
    );
    const toggleMembership = useToggleCommunityMembership();

    if (isLoading) {
        return <CommunityDetailsSkeleton />;
    }

    if (!community) {
        return (
            <View className="flex-1 items-center justify-center gap-4 p-10">
                <Text className="text-headline-md font-semibold text-text-primary">
                    Community not found
                </Text>

                <Text className="text-center text-body-sm text-text-secondary">
                    The community you are looking for does not exist.
                </Text>

                <GradientButton
                    onPress={() => router.replace("/(tabs)")}
                    label="Return to Home"
                    className="rounded-full"
                    contentStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
                    textClassName="text-body-sm font-semibold"
                />
            </View>
        );
    }

    const isMember = community.membershipStatus === "joined";
    const canCreatePost = isMember;
    const isPrivateLocked = community.visibility === "private" && !isMember;

    function handleMembershipChange() {
        if (!community || toggleMembership.isPending) return;

        toggleMembership.mutate({ community });
    }

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-8"
            keyboardShouldPersistTaps="handled"
        >
            <CommunityHeader
                community={community}
                isPending={toggleMembership.isPending}
                onMembershipChange={handleMembershipChange}
            />

            <View className="mt-4 px-4">
                <CommunityTabs
                    community={community}
                    members={members}
                    posts={posts}
                    canCreatePost={canCreatePost}
                    isPrivateLocked={isPrivateLocked}
                    isLoadingPosts={isLoadingPosts}
                    isLoadingMembers={isLoadingMembers}
                />
            </View>
        </ScrollView>
    );
}
