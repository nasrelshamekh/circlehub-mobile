import { useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";

import CreatePost from "@/components/createpost";
import PostCard from "@/components/postcard";
import FeedSkeleton from "@/components/skeletons/feedskeleton";
import PostCardSkeleton from "@/components/skeletons/postcardskeleton";
import { useTheme } from "@/context/themecontext";
import useFeedPosts from "@/hooks/useFeedPosts";
import { subscribeFeedScrollToTop } from "@/lib/feedScroll";
import { ApiError } from "@/types/api";
import { Post } from "@/types/post";
import { themeColors } from "@/theme/colors";

export default function Feed() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const { posts, isLoading, isLoadingMore, hasMore, loadMore, refetch, isRefetching, error } = useFeedPosts();

    const listRef = useRef<FlatList<Post>>(null);
    const [scrollToTopPending, setScrollToTopPending] = useState(false);

    // Scroll back to the top after a post is published, even when the feed was
    // scrolled down before the composer was opened.
    useEffect(() => {
        return subscribeFeedScrollToTop(() => setScrollToTopPending(true));
    }, []);

    useEffect(() => {
        if (!scrollToTopPending || isLoading || posts.length === 0) return;

        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
            setScrollToTopPending(false);
        });
    }, [scrollToTopPending, isLoading, posts.length]);

    if (isLoading) {
        return <FeedSkeleton />;
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
            ref={listRef}
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
                        <PostCardSkeleton />
                    </View>
                ) : null
            }
        />
    );
}