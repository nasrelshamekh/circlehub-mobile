import { FileText, Network, Users } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import CommunityResultCard from "@/components/explore/communityresultcard";
import ExplorePostCard from "@/components/explore/explorepostcard";
import UserResultCard from "@/components/explore/userresultcard";
import CommunityResultCardSkeleton from "@/components/skeletons/communityresultcardskeleton";
import ExplorePostCardSkeleton from "@/components/skeletons/explorepostcardskeleton";
import UserResultCardSkeleton from "@/components/skeletons/userresultcardskeleton";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { CommunityListItem } from "@/types/community";
import { Post } from "@/types/post";
import { SearchUser } from "@/types/search";

import type { LucideIcon } from "lucide-react-native";

const TABS = [
    { value: "posts", label: "Posts", icon: FileText },
    { value: "users", label: "People", icon: Users },
    { value: "communities", label: "Communities", icon: Network },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const SKELETON_COUNT = 3;

export default function ExploreTabs({
    posts,
    users,
    communities,
    searchQuery,
    isLoading,
}: {
    posts: Post[];
    users: SearchUser[];
    communities: CommunityListItem[];
    searchQuery: string;
    isLoading: boolean;
}) {
    const [activeTab, setActiveTab] = useState<TabValue>("posts");

    return (
        <View className="gap-4">
            <View className="flex-row rounded-2xl bg-surface-low p-1">
                {TABS.map((tab) => {
                    const isActive = tab.value === activeTab;

                    return (
                        <Pressable
                            key={tab.value}
                            onPress={() => setActiveTab(tab.value)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            className={
                                isActive
                                    ? "flex-1 items-center justify-center rounded-xl bg-surface-lowest py-2.5"
                                    : "flex-1 items-center justify-center rounded-xl py-2.5"
                            }
                        >
                            <Text
                                numberOfLines={1}
                                className={
                                    isActive
                                        ? "text-label-md font-semibold text-primary"
                                        : "text-label-md text-text-secondary"
                                }
                            >
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {activeTab === "posts" && (
                <View className="gap-3">
                    {isLoading && posts.length === 0 ? (
                        Array.from({ length: SKELETON_COUNT }, (_, index) => (
                            <ExplorePostCardSkeleton key={index} />
                        ))
                    ) : posts.length > 0 ? (
                        posts.map((post) => (
                            <ExplorePostCard key={post.id} post={post} />
                        ))
                    ) : (
                        <ExploreEmptyState
                            icon={FileText}
                            title="No posts found"
                            subtitle={
                                searchQuery
                                    ? "Try searching for another keyword or author."
                                    : "Posts will appear here when available."
                            }
                        />
                    )}
                </View>
            )}

            {activeTab === "users" && (
                <View className="gap-3">
                    {isLoading && users.length === 0 ? (
                        Array.from({ length: SKELETON_COUNT }, (_, index) => (
                            <UserResultCardSkeleton key={index} />
                        ))
                    ) : users.length > 0 ? (
                        users.map((user) => (
                            <UserResultCard key={user.id} user={user} />
                        ))
                    ) : (
                        <ExploreEmptyState
                            icon={Users}
                            title="No people found"
                            subtitle={
                                searchQuery
                                    ? "Try searching by name, username, or job title."
                                    : "Suggested people will appear here."
                            }
                        />
                    )}
                </View>
            )}

            {activeTab === "communities" && (
                <View className="gap-3">
                    {isLoading && communities.length === 0 ? (
                        Array.from({ length: SKELETON_COUNT }, (_, index) => (
                            <CommunityResultCardSkeleton key={index} />
                        ))
                    ) : communities.length > 0 ? (
                        communities.map((community) => (
                            <CommunityResultCard
                                key={community.id}
                                community={community}
                            />
                        ))
                    ) : (
                        <ExploreEmptyState
                            icon={Network}
                            title="No communities found"
                            subtitle={
                                searchQuery
                                    ? "Try searching by community name or category."
                                    : "Communities will appear here."
                            }
                        />
                    )}
                </View>
            )}
        </View>
    );
}

function ExploreEmptyState({
    icon: Icon,
    title,
    subtitle,
}: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <View className="items-center rounded-2xl bg-surface-lowest px-6 py-10">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-active">
                <Icon size={24} color={colors.primary} />
            </View>

            <Text className="text-title-lg font-semibold text-text-primary">
                {title}
            </Text>

            <Text className="mt-2 max-w-sm text-center text-body-sm text-text-secondary">
                {subtitle}
            </Text>
        </View>
    );
}
