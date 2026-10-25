import {
    Grid2X2,
    Heart,
    Image as ImageIcon,
    Info,
    Lock,
} from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";

import PostCard from "@/components/postcard";
import PostCardSkeleton from "@/components/skeletons/postcardskeleton";
import { useTheme } from "@/context/themecontext";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { Post } from "@/types/post";
import { UserProfile } from "@/types/user";

import type { LucideIcon } from "lucide-react-native";

const TABS = [
    { value: "posts", label: "Posts", icon: Grid2X2 },
    { value: "media", label: "Media", icon: ImageIcon },
    { value: "liked", label: "Liked", icon: Heart },
    { value: "about", label: "About", icon: Info },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function formatLongDate(value: string) {
    return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatJoined(value: string) {
    return new Date(value).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
}

export default function ProfileTabs({
    user,
    posts = [],
    likedPosts = [],
    isLoadingPosts = false,
    isLoadingLikedPosts = false,
}: {
    user: UserProfile;
    posts?: Post[];
    likedPosts?: Post[];
    isLoadingPosts?: boolean;
    isLoadingLikedPosts?: boolean;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const [activeTab, setActiveTab] = useState<TabValue>("posts");

    const isUserAuthor = (author?: Post["author"]) => {
        if (!author) return true;
        if (user?.id && author?.id && author.id.toLowerCase() === user.id.toLowerCase()) return true;
        if (user?.username && author?.username && author.username.toLowerCase() === user.username.toLowerCase()) return true;
        return true;
    };

    const userPosts = (posts ?? []).filter((post) => isUserAuthor(post.author));
    const mediaPosts = (posts ?? []).filter(
        (post) => isUserAuthor(post.author) && Boolean(post.imageUrl)
    );

    if (user.isProfileLocked) {
        const isFollowersOnly = user.profileVisibility === "followers";

        return (
            <EmptyTabState
                icon={Lock}
                title={isFollowersOnly ? "Followers only" : "This account is private"}
                subtitle={
                    isFollowersOnly
                        ? "Follow this account to see their posts and activity."
                        : "This account only shares their posts with themselves."
                }
            />
        );
    }

    return (
        <View className="gap-5">
            <View className="flex-row flex-wrap rounded-lg bg-surface-lowest p-2 shadow-sm gap-2">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;

                    return (
                        <Pressable
                            key={tab.value}
                            onPress={() => setActiveTab(tab.value)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            className={`flex-row items-center justify-center gap-2 rounded-lg px-3 py-3 basis-[48%] grow ${
                                isActive ? "bg-active" : ""
                            }`}
                        >
                            <Icon
                                size={16}
                                color={
                                    isActive
                                        ? colors.primary
                                        : colors.textSecondary
                                }
                            />
                            <Text
                                className={`text-label-md font-medium ${
                                    isActive
                                        ? "text-primary"
                                        : "text-text-secondary"
                                }`}
                            >
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {activeTab === "posts" &&
                (isLoadingPosts ? (
                    <View className="gap-4">
                        <PostCardSkeleton />
                        <PostCardSkeleton />
                    </View>
                ) : userPosts.length > 0 ? (
                    <View className="gap-4">
                        {userPosts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </View>
                ) : (
                    <EmptyTabState
                        icon={Grid2X2}
                        title="No posts yet"
                        subtitle="Posts shared by this user will appear here."
                    />
                ))}

            {activeTab === "media" &&
                (isLoadingPosts ? (
                    <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                        <View className="mb-4 h-6 w-24 rounded bg-surface-low" />
                        <View
                            style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 12,
                            }}
                        >
                            {[1, 2, 3, 4].map((i) => (
                                <View
                                    key={i}
                                    className="w-[48%] aspect-square rounded-xl bg-surface-low"
                                />
                            ))}
                        </View>
                    </View>
                ) : mediaPosts.length > 0 ? (
                    <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                        <Text className="mb-4 text-title-lg font-semibold text-text-primary">
                            Media
                        </Text>
                        <View
                            style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 12,
                            }}
                        >
                            {mediaPosts.map((post) => {
                                const imgUrl = getImageUrl(post.imageUrl);
                                if (!imgUrl) return null;
                                return (
                                    <Pressable
                                        key={post.id}
                                        onPress={() =>
                                            router.push(`/post/${post.id}` as any)
                                        }
                                        accessibilityRole="button"
                                        accessibilityLabel="View post"
                                        className="w-[48%] aspect-square rounded-xl overflow-hidden bg-surface-low active:opacity-85"
                                    >
                                <Image
                                    key={post.id}
                                    source={{ uri: imgUrl }}
                                    className="h-full w-full"
                                    resizeMode="cover"
                                />
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                ) : (
                    <EmptyTabState
                        icon={ImageIcon}
                        title="No media yet"
                        subtitle="Photo and image posts will appear here."
                    />
                ))}

            {activeTab === "liked" &&
                (isLoadingLikedPosts ? (
                    <View className="gap-4">
                        <PostCardSkeleton />
                        <PostCardSkeleton />
                    </View>
                ) : likedPosts.length > 0 ? (
                    <View className="gap-4">
                        {likedPosts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </View>
                ) : (
                    <EmptyTabState
                        icon={Heart}
                        title="No liked posts yet"
                        subtitle="Liked posts will appear here."
                    />
                ))}

            {activeTab === "about" && <AboutTab user={user} />}
        </View>
    );
}

function AboutTab({ user }: { user: UserProfile }) {
    const joined = formatJoined(user.createdAt);

    return (
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <Text className="mb-2 text-headline-md font-semibold text-text-primary">
                About
            </Text>

            {user.bio ? (
                <Text className="text-body-md text-text-secondary">
                    {user.bio}
                </Text>
            ) : null}

            <View className="mt-6 gap-4">
                <DetailRow label="Full Name:" value={user.name} />
                <DetailRow label="Username:" value={`@${user.username}`} />
                <DetailRow
                    label="Gender:"
                    value={user.gender === "male" ? "Male" : "Female"}
                />
                <DetailRow
                    label="Date of Birth:"
                    value={user.dateOfBirth ? formatLongDate(user.dateOfBirth) : null}
                />
                <DetailRow label="Job Title:" value={user.jobTitle} />
                <DetailRow label="Location:" value={user.location} />
                <DetailRow label="Joined:" value={joined} />
                <DetailRow label="Website:" value={user.website} isLink />
            </View>
        </View>
    );
}

function DetailRow({
    label,
    value,
    isLink = false,
}: {
    label: string;
    value: string | null | undefined;
    isLink?: boolean;
}) {
    async function handleOpenLink() {
        if (!value) return;
        const url = value.startsWith("http") ? value : `https://${value}`;
        await Linking.openURL(url).catch(() => undefined);
    }

    return (
        <View className="flex-row items-start gap-4">
            <Text className="w-32 text-label-md text-primary">{label}</Text>

            {isLink && value ? (
                <Pressable onPress={handleOpenLink} className="flex-1">
                    <Text className="text-body-sm font-medium text-primary">
                        {value}
                    </Text>
                </Pressable>
            ) : (
                <Text className="flex-1 text-body-sm text-text-secondary">
                    {value ?? ""}
                </Text>
            )}
        </View>
    );
}

function EmptyTabState({
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
