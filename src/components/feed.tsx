import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";

import CreatePost from "@/components/createpost";
import PostCard from "@/components/postcard";
import { useTheme } from "@/context/themecontext";
import useFeedPosts from "@/hooks/useFeedPosts";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

export default function Feed() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const { posts, isLoading, isLoadingMore, hasMore, loadMore, refetch, isRefetching, error } = useFeedPosts();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error && posts.length === 0) {
        const message = error instanceof ApiError ? error.message : (error instanceof Error ? error.message : "Could not load the feed.");

        return (
            <View className="flex-1 items-center justify-center px-4">
                <Text className="text-body-md text-error">
                    {message}
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-4 px-4 py-4"
            ListHeaderComponent={<CreatePost />}
            renderItem={({ item }) => <PostCard post={item} />}
            onEndReached={() => {
                if (hasMore && !isLoadingMore) {
                    loadMore();
                }
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
                <RefreshControl
                    refreshing={isRefetching && !isLoadingMore}
                    onRefresh={refetch}
                    tintColor={colors.primary}
                />
            }
            ListFooterComponent={
                isLoadingMore ? (
                    <View className="py-4">
                        <ActivityIndicator />
                    </View>
                ) : null
            }
        />
    );
}