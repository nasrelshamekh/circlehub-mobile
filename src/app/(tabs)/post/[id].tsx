import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
    KeyboardAvoidingView,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CommentList from "@/components/comment/commentlist";
import PostCard from "@/components/postcard";
import PostDetailsSkeleton from "@/components/skeletons/postdetailsskeleton";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { useCommunityDetails } from "@/hooks/useCommunityDetails";
import { usePostDetails } from "@/hooks/usePostDetails";
import { themeColors } from "@/theme/colors";

export default function PostDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { post, isLoading } = usePostDetails(id);
    const { community } = useCommunityDetails(post?.community?.slug);
    const { isDark } = useTheme();

    const colors = isDark ? themeColors.dark : themeColors.light;

    // Community admins and moderators can delete posts they don't own.
    const canManageCommunity =
        community?.communityRole === "admin" ||
        community?.communityRole === "moderator";

    function goBack() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low" edges={["top"]}>
            <View className="flex-row items-center gap-2 px-2 py-2">
                <Pressable
                    onPress={goBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full"
                >
                    <ChevronLeft size={24} color={colors.textPrimary} />
                </Pressable>

                <Text className="text-title-lg font-semibold text-text-primary">
                    Post
                </Text>
            </View>

            {isLoading ? (
                <PostDetailsSkeleton />
            ) : post ? (
                <KeyboardAvoidingView
                    className="flex-1"
                    behavior="padding"
                    keyboardVerticalOffset={16}
                >
                    <ScrollView
                        className="flex-1"
                        contentContainerClassName="p-4 pb-10"
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Already on the comment page, so this button is a no-op. */}
                        <PostCard
                            post={post}
                            onPressComments={() => undefined}
                            onDeleted={goBack}
                            canDelete={canManageCommunity}
                        />
                        <CommentList post={post} />
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <View className="flex-1 items-center justify-center gap-4 p-10">
                    <Text className="text-headline-md font-semibold text-text-primary">
                        Post not found
                    </Text>

                    <Text className="text-center text-body-sm text-text-secondary">
                        This post may have been removed, or the link you
                        followed is no longer available.
                    </Text>

                    <GradientButton
                        onPress={() => router.replace("/(tabs)")}
                        label="Return to Home"
                        className="rounded-full"
                        contentStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
                        textClassName="text-body-sm font-semibold"
                    />
                </View>
            )}
        </SafeAreaView>
    );
}