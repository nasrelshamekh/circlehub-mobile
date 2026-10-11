import { Lock } from "lucide-react-native";
import { Text, View } from "react-native";

import EmptyState from "@/components/ui/emptystate";
import { CommunityDetails, CommunityMember } from "@/types/community";

import { MemberRow, MemberRowSkeleton } from "./communitytabshared";

type CommunityMembersTabProps = {
    community: CommunityDetails;
    members: CommunityMember[];
    isPrivateLocked: boolean;
    isLoadingMembers: boolean;
};

export default function CommunityMembersTab({
    community,
    members,
    isPrivateLocked,
    isLoadingMembers,
}: CommunityMembersTabProps) {
    if (isPrivateLocked) {
        return (
            <EmptyState
                icon={Lock}
                title="This community is private"
                subtitle={`Request to join ${community.name} to view its members.`}
            />
        );
    }

    return (
        <View className="gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <Text className="text-title-lg font-semibold text-text-primary">
                Members
            </Text>

            {isLoadingMembers && members.length === 0 ? (
                <View className="gap-3">
                    <MemberRowSkeleton />
                    <MemberRowSkeleton />
                    <MemberRowSkeleton />
                </View>
            ) : members.length > 0 ? (
                members.map((member) => (
                    <MemberRow key={member.id} member={member} />
                ))
            ) : (
                <Text className="text-body-sm text-text-secondary">
                    No members to show yet.
                </Text>
            )}
        </View>
    );
}
