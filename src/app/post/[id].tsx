import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CommentList from "@/components/comment/commentlist";
import PostCard from "@/components/postcard";
import { useTheme } from "@/context/themecontext";
import { usePostDetails } from "@/hooks/usePostDetails";
import { themeColors } from "@/theme/colors";

/**
 * Post details: the full post card with a comment composer and the comment
 * thread. Pushed onto the root stack (see src/app/_layout.tsx) from the
 * comment button on any post, so it slides in over the tabs.
 */
export default function PostDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { post, isLoading } = usePostDetails(id);
    const { isDark } = useTheme();

    const colors = isDark ? themeColors.dark : themeColors.light;

    function goBack() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low" edges={["top"]}>
            {/* Header */}
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
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            ) : post ? (
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="p-4 pb-10"
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Already on the comment page, so the comment button on the
                        card is a no-op here. */}
                    <PostCard post={post} onPressComments={() => undefined} />
                    <CommentList post={post} />
                </ScrollView>
            ) : (
                <View className="flex-1 items-center justify-center gap-4 p-10">
                    <Text className="text-headline-md font-semibold text-text-primary">
                        Post not found
                    </Text>

                    <Text className="text-center text-body-sm text-text-secondary">
                        This post may have been removed, or the link you
                        followed is no longer available.
                    </Text>

                    <Pressable
                        onPress={() => router.replace("/(tabs)")}
                        accessibilityRole="button"
                        className="rounded-full bg-primary px-5 py-3"
                    >
                        <Text className="text-body-sm font-semibold text-on-primary">
                            Return to Home
                        </Text>
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}