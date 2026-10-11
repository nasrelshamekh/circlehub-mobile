import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import { CommunityDetails, CommunityMember } from "@/types/community";

import { MemberRow, MemberRowSkeleton } from "./communitytabshared";

type CommunityAboutTabProps = {
    community: CommunityDetails;
    members: CommunityMember[];
    isPrivateLocked: boolean;
    isLoadingMembers: boolean;
};

export default function CommunityAboutTab({
    community,
    members,
    isPrivateLocked,
    isLoadingMembers,
}: CommunityAboutTabProps) {
    return (
        <View className="gap-4">
            <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <Text className="text-title-lg font-semibold text-text-primary">
                    About
                </Text>

                <Text className="mt-3 text-body-sm text-text-secondary">
                    {community.description || "No description provided."}
                </Text>

                <View className="mt-5 gap-3">
                    <DetailRow label="Name" value={community.name} />
                    <DetailRow label="Slug" value={community.slug} />
                    <DetailRow label="Category" value={community.category} />
                    <DetailRow
                        label="Visibility"
                        value={
                            community.visibility === "private"
                                ? "Private"
                                : "Public"
                        }
                    />
                    <DetailRow
                        label="Members"
                        value={String(community.membersCount)}
                    />
                    <DetailRow
                        label="Posts"
                        value={String(community.postsCount)}
                    />
                </View>
            </View>

            <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <Text className="text-title-lg font-semibold text-text-primary">
                    Admin
                </Text>

                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: "/profile/[username]",
                            params: { username: community.admin.username },
                        })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`View ${community.admin.name}'s profile`}
                    className="mt-4 flex-row items-center gap-3"
                >
                    <Avatar
                        src={community.admin.avatarUrl}
                        name={community.admin.name}
                        className="h-12 w-12"
                    />

                    <View className="min-w-0 flex-1">
                        <Text
                            numberOfLines={1}
                            className="text-label-md font-semibold text-text-primary"
                        >
                            {community.admin.name}
                        </Text>

                        {community.admin.jobTitle ? (
                            <Text
                                numberOfLines={1}
                                className="text-label-sm text-text-secondary"
                            >
                                {community.admin.jobTitle}
                            </Text>
                        ) : null}
                    </View>
                </Pressable>
            </View>

            <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <Text className="text-title-lg font-semibold text-text-primary">
                    Active Members
                </Text>

                {isPrivateLocked ? (
                    <Text className="mt-3 text-body-sm text-text-secondary">
                        Request to join {community.name} to view its active
                        members.
                    </Text>
                ) : isLoadingMembers && members.length === 0 ? (
                    <View className="mt-3 gap-2.5">
                        <MemberRowSkeleton />
                        <MemberRowSkeleton />
                    </View>
                ) : members.length > 0 ? (
                    <View className="mt-3 gap-2.5">
                        {members.slice(0, 4).map((member) => (
                            <MemberRow key={member.id} member={member} />
                        ))}
                    </View>
                ) : (
                    <Text className="mt-3 text-body-sm text-text-secondary">
                        No members to show yet.
                    </Text>
                )}
            </View>

            <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <Text className="text-title-lg font-semibold text-text-primary">
                    Highlights
                </Text>

                <View className="mt-4 flex-row flex-wrap gap-2">
                    {[
                        community.category,
                        `${community.postsCount} featured posts`,
                        community.visibility,
                    ].map((tag) => (
                        <View
                            key={tag}
                            className="rounded-full bg-active px-3 py-1.5"
                        >
                            <Text className="text-label-sm capitalize text-primary">
                                {tag}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row items-center gap-3">
            <Text className="w-24 text-label-md text-primary">{label}:</Text>
            <Text className="flex-1 text-body-sm text-text-secondary">
                {value}
            </Text>
        </View>
    );
}
