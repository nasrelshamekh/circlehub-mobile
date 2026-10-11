import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import Skeleton from "@/components/ui/skeleton";
import { CommunityMember } from "@/types/community";

export function MemberRow({ member }: { member: CommunityMember }) {
    return (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/profile/[username]",
                    params: { username: member.username },
                })
            }
            accessibilityRole="button"
            accessibilityLabel={`View ${member.name}'s profile`}
            className="flex-row items-center gap-3 rounded-xl bg-surface-low p-3"
        >
            <Avatar
                src={member.avatarUrl}
                name={member.name}
                className="h-11 w-11"
            />

            <View className="min-w-0 flex-1">
                <Text
                    numberOfLines={1}
                    className="text-label-md font-semibold text-text-primary"
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

                {member.location ? (
                    <Text
                        numberOfLines={1}
                        className="text-label-sm text-text-secondary"
                    >
                        {member.location}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    );
}

export function MemberRowSkeleton() {
    return (
        <View className="flex-row items-center gap-3 rounded-xl bg-surface-low p-3">
            <Skeleton className="h-11 w-11 rounded-full" />

            <View className="flex-1 gap-1.5">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
            </View>
        </View>
    );
}
