import {
    ArrowRight,
    Clock,
    Compass,
    FileText,
    Flame,
    Images,
    Network,
    Users,
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

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

export const EXPLORE_TABS = [
    { value: "all", label: "All", icon: Compass },
    { value: "posts", label: "Posts", icon: FileText },
    { value: "media", label: "Media", icon: Images },
    { value: "users", label: "People", icon: Users },
    { value: "communities", label: "Communities", icon: Network },
] as const;

export type ExploreTabValue = (typeof EXPLORE_TABS)[number]["value"];

const SKELETON_COUNT = 3;

export default function ExploreTabs({
    posts,
    users,
    communities,
    searchQuery,
    isLoading,
    activeTab,
    onTabChange,
    sort,
    onSortChange,
    mediaOnly,
    onMediaOnlyChange,
}: {
    posts: Post[];
    users: SearchUser[];
    communities: CommunityListItem[];
    searchQuery: string;
    isLoading: boolean;
    activeTab: ExploreTabValue;
    onTabChange: (tab: ExploreTabValue) => void;
    sort: "latest" | "top";
    onSortChange: (sort: "latest" | "top") => void;
    mediaOnly: boolean;
    onMediaOnlyChange: (mediaOnly: boolean) => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const mediaPosts = posts.filter(
        (p) => Boolean(p.imageUrl) || Boolean(p.imageUrls && p.imageUrls.length > 0)
    );

    const hasAnyResults =
        posts.length > 0 || users.length > 0 || communities.length > 0;

    return (
        <View className="gap-4">
            {/* Scrollable Facet Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
                className="rounded-2xl bg-surface-low p-1.5"
            >
                {EXPLORE_TABS.map((tab) => {
                    const isActive = tab.value === activeTab;
                    const Icon = tab.icon;

                    return (
                        <Pressable
                            key={tab.value}
                            onPress={() => onTabChange(tab.value)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            className={`flex-row items-center gap-1.5 rounded-xl px-4 py-2.5 ${
                                isActive ? "bg-surface-lowest shadow-sm" : ""
                            }`}
                        >
                            <Icon
                                size={16}
                                color={isActive ? colors.primary : colors.textSecondary}
                            />
                            <Text
                                className={`text-label-md ${
                                    isActive
                                        ? "font-semibold text-primary"
                                        : "text-text-secondary"
                                }`}
                            >
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Sort & Filter Controls */}
            {(activeTab === "all" || activeTab === "posts" || activeTab === "media") && (
                <View className="flex-row items-center justify-between pt-1">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-label-xs text-text-secondary">Sort:</Text>

                        <Pressable
                            onPress={() => onSortChange("latest")}
                            className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
                                sort === "latest" ? "bg-primary" : "bg-surface-lowest"
                            }`}
                        >
                            <Clock
                                size={12}
                                color={sort === "latest" ? "#ffffff" : colors.textSecondary}
                            />
                            <Text
                                className={`text-label-xs font-semibold ${
                                    sort === "latest" ? "text-white" : "text-text-secondary"
                                }`}
                            >
                                Latest
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => onSortChange("top")}
                            className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
                                sort === "top" ? "bg-primary" : "bg-surface-lowest"
                            }`}
                        >
                            <Flame
                                size={12}
                                color={sort === "top" ? "#ffffff" : colors.textSecondary}
                            />
                            <Text
                                className={`text-label-xs font-semibold ${
                                    sort === "top" ? "text-white" : "text-text-secondary"
                                }`}
                            >
                                Top
                            </Text>
                        </Pressable>
                    </View>

                    {activeTab === "posts" && (
                        <Pressable
                            onPress={() => onMediaOnlyChange(!mediaOnly)}
                            className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                                mediaOnly ? "bg-primary/15" : "bg-surface-lowest"
                            }`}
                        >
                            <Images
                                size={13}
                                color={mediaOnly ? colors.primary : colors.textSecondary}
                            />
                            <Text
                                className={`text-label-xs font-semibold ${
                                    mediaOnly ? "text-primary" : "text-text-secondary"
                                }`}
                            >
                                Photos only
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}

            {/* All (Aggregated Overview) */}
            {activeTab === "all" && (
                <View className="gap-6">
                    {isLoading && !hasAnyResults ? (
                        Array.from({ length: SKELETON_COUNT }, (_, index) => (
                            <ExplorePostCardSkeleton key={index} />
                        ))
                    ) : !hasAnyResults ? (
                        <ExploreEmptyState
                            icon={Compass}
                            title="No results found"
                            subtitle={
                                searchQuery
                                    ? `No matches found for "${searchQuery}". Try different keywords or filters.`
                                    : "Explore content across CircleHub."
                            }
                        />
                    ) : (
                        <>
                            {/* Matched People Snippet */}
                            {users.length > 0 && (
                                <View className="gap-3">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-1.5">
                                            <Users size={16} color={colors.primary} />
                                            <Text className="text-label-md font-bold text-text-primary">
                                                People
                                            </Text>
                                        </View>

                                        {users.length > 2 && (
                                            <Pressable
                                                onPress={() => onTabChange("users")}
                                                className="flex-row items-center gap-1"
                                            >
                                                <Text className="text-label-xs font-semibold text-primary">
                                                    View all ({users.length})
                                                </Text>
                                                <ArrowRight size={12} color={colors.primary} />
                                            </Pressable>
                                        )}
                                    </View>

                                    <View className="gap-2.5">
                                        {users.slice(0, 2).map((user) => (
                                            <UserResultCard key={user.id} user={user} />
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Matched Communities Snippet */}
                            {communities.length > 0 && (
                                <View className="gap-3">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-1.5">
                                            <Network size={16} color={colors.primary} />
                                            <Text className="text-label-md font-bold text-text-primary">
                                                Communities
                                            </Text>
                                        </View>

                                        {communities.length > 2 && (
                                            <Pressable
                                                onPress={() => onTabChange("communities")}
                                                className="flex-row items-center gap-1"
                                            >
                                                <Text className="text-label-xs font-semibold text-primary">
                                                    View all ({communities.length})
                                                </Text>
                                                <ArrowRight size={12} color={colors.primary} />
                                            </Pressable>
                                        )}
                                    </View>

                                    <View className="gap-2.5">
                                        {communities.slice(0, 2).map((community) => (
                                            <CommunityResultCard
                                                key={community.id}
                                                community={community}
                                            />
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Matched Posts */}
                            {posts.length > 0 && (
                                <View className="gap-3">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-1.5">
                                            <FileText size={16} color={colors.primary} />
                                            <Text className="text-label-md font-bold text-text-primary">
                                                Posts
                                            </Text>
                                        </View>

                                        {posts.length > 3 && (
                                            <Pressable
                                                onPress={() => onTabChange("posts")}
                                                className="flex-row items-center gap-1"
                                            >
                                                <Text className="text-label-xs font-semibold text-primary">
                                                    View all ({posts.length})
                                                </Text>
                                                <ArrowRight size={12} color={colors.primary} />
                                            </Pressable>
                                        )}
                                    </View>

                                    <View className="gap-3">
                                        {posts.map((post) => (
                                            <ExplorePostCard key={post.id} post={post} />
                                        ))}
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </View>
            )}

            {/* Posts */}
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

            {/* Media */}
            {activeTab === "media" && (
                <View className="gap-3">
                    {isLoading && posts.length === 0 ? (
                        Array.from({ length: SKELETON_COUNT }, (_, index) => (
                            <ExplorePostCardSkeleton key={index} />
                        ))
                    ) : mediaPosts.length > 0 ? (
                        mediaPosts.map((post) => (
                            <ExplorePostCard key={post.id} post={post} />
                        ))
                    ) : (
                        <ExploreEmptyState
                            icon={Images}
                            title="No media posts found"
                            subtitle={
                                searchQuery
                                    ? "No posts with photos or galleries matched your search."
                                    : "Posts with photos or galleries will appear here."
                            }
                        />
                    )}
                </View>
            )}

            {/* People */}
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

            {/* Communities */}
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
