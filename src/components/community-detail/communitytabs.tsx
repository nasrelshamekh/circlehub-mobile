import { FileText, Image as ImageIcon, Info, Users } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import CommunityAboutTab from "@/components/community-detail/tabs/communityabouttab";
import CommunityMediaTab from "@/components/community-detail/tabs/communitymediatab";
import CommunityMembersTab from "@/components/community-detail/tabs/communitymemberstab";
import CommunityPostsTab from "@/components/community-detail/tabs/communitypoststab";
import { CommunityDetails, CommunityMember } from "@/types/community";
import { Post } from "@/types/post";

const TABS = [
    { value: "posts", label: "Posts", icon: FileText },
    { value: "members", label: "Members", icon: Users },
    { value: "media", label: "Media", icon: ImageIcon },
    { value: "about", label: "About", icon: Info },
] as const;

type TabValue = (typeof TABS)[number]["value"];

type CommunityTabsProps = {
    community: CommunityDetails;
    members: CommunityMember[];
    posts: Post[];
    canCreatePost: boolean;
    isPrivateLocked: boolean;
    isLoadingPosts: boolean;
    isLoadingMembers: boolean;
};

export default function CommunityTabs({
    community,
    members,
    posts,
    canCreatePost,
    isPrivateLocked,
    isLoadingPosts,
    isLoadingMembers,
}: CommunityTabsProps) {
    const [activeTab, setActiveTab] = useState<TabValue>("posts");

    const canManagePosts =
        community.communityRole === "admin" ||
        community.communityRole === "moderator";

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
                                        ? "text-label-sm font-semibold text-primary"
                                        : "text-label-sm text-text-secondary"
                                }
                            >
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {activeTab === "posts" && (
                <CommunityPostsTab
                    community={community}
                    posts={posts}
                    canCreatePost={canCreatePost}
                    canManagePosts={canManagePosts}
                    isPrivateLocked={isPrivateLocked}
                    isLoadingPosts={isLoadingPosts}
                />
            )}

            {activeTab === "members" && (
                <CommunityMembersTab
                    community={community}
                    members={members}
                    isPrivateLocked={isPrivateLocked}
                    isLoadingMembers={isLoadingMembers}
                />
            )}

            {activeTab === "media" && (
                <CommunityMediaTab
                    community={community}
                    posts={posts}
                    isPrivateLocked={isPrivateLocked}
                    isLoadingPosts={isLoadingPosts}
                />
            )}

            {activeTab === "about" && (
                <CommunityAboutTab
                    community={community}
                    members={members}
                    isPrivateLocked={isPrivateLocked}
                    isLoadingMembers={isLoadingMembers}
                />
            )}
        </View>
    );
}
