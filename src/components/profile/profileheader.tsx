import { CalendarDays, MapPin } from "lucide-react-native";
import { Image, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import { useTheme } from "@/context/themecontext";
import { getImageUrl } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";
import { UserProfile } from "@/types/user";

/**
 * Profile hero — cover image, overlapping avatar, name, bio and stats —
 * mirroring the web app's ProfileHeader. The avatar ring uses the card's
 * surface-lowest background so it works in both color schemes.
 */
export default function ProfileHeader({ user }: { user: UserProfile }) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const joined = new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    return (
        <View>
            {/* Cover image */}
            <View className="relative h-44 w-full">
                {user.coverImageUrl ? (
                    <Image
                        source={{ uri: getImageUrl(user.coverImageUrl)! }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="h-full w-full bg-surface-high" />
                )}
                <View className="absolute inset-0 bg-black/25" />
            </View>

            {/* Profile card */}
            <View className="mx-4 -mt-12 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <View className="-mt-14 self-start rounded-full bg-surface-lowest p-1.5">
                    <Avatar
                        src={user.avatarUrl}
                        name={user.name}
                        className="h-20 w-20"
                        textClassName="text-headline-md"
                    />
                </View>

                <View className="mt-2 flex-row items-center gap-2">
                    <Text className="text-headline-lg font-bold text-text-primary">
                        {user.name}
                    </Text>
                    {!user.isCurrentUser && user.followsMe && (
                        <View className="rounded-full bg-surface-low px-3 py-1">
                            <Text className="text-label-sm text-primary">
                                Follows you
                            </Text>
                        </View>
                    )}
                </View>

                <Text className="mt-0.5 text-body-sm text-text-secondary">
                    @{user.username}
                    {user.jobTitle ? `  •  ${user.jobTitle}` : ""}
                </Text>

                {user.bio ? (
                    <Text className="mt-2 text-body-sm text-text-secondary">
                        {user.bio}
                    </Text>
                ) : null}

                {/* Location / joined */}
                <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
                    {user.location ? (
                        <View className="flex-row items-center gap-1.5">
                            <MapPin size={14} color={colors.textSecondary} />
                            <Text className="text-body-sm text-text-secondary">
                                {user.location}
                            </Text>
                        </View>
                    ) : null}

                    <View className="flex-row items-center gap-1.5">
                        <CalendarDays size={14} color={colors.textSecondary} />
                        <Text className="text-body-sm text-text-secondary">
                            Joined {joined}
                        </Text>
                    </View>
                </View>

                {/* Stats */}
                <View className="mt-4 flex-row gap-8">
                    <View>
                        <Text className="text-label-md font-bold text-text-primary">
                            {user.postsCount}
                        </Text>
                        <Text className="text-body-sm text-text-secondary">
                            Posts
                        </Text>
                    </View>
                    <View>
                        <Text className="text-label-md font-bold text-text-primary">
                            {user.followersCount}
                        </Text>
                        <Text className="text-body-sm text-text-secondary">
                            Followers
                        </Text>
                    </View>
                    <View>
                        <Text className="text-label-md font-bold text-text-primary">
                            {user.followingCount}
                        </Text>
                        <Text className="text-body-sm text-text-secondary">
                            Following
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}