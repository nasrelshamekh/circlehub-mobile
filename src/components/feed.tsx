import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowUp } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import CreatePost from "@/components/createpost";
import PostCard from "@/components/postcard";
import FeedSkeleton from "@/components/skeletons/feedskeleton";
import PostCardSkeleton from "@/components/skeletons/postcardskeleton";
import { useTheme } from "@/context/themecontext";
import useFeedPosts from "@/hooks/useFeedPosts";
import { subscribePostCreated } from "@/lib/feedEvents";
import { subscribeFeedScrollToTop } from "@/lib/feedScroll";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError, PageMeta } from "@/types/api";
import { Post } from "@/types/post";
import { themeColors } from "@/theme/colors";

export default function Feed() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const queryClient = useQueryClient();

    const { posts, isLoading, isLoadingMore, hasMore, loadMore, refetch, isRefetching, error } = useFeedPosts();

    const listRef = useRef<FlatList<Post>>(null);
    const [scrollToTopPending, setScrollToTopPending] = useState(false);
    const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
    const pendingPostsRef = useRef<Post[]>([]);
    const scrollOffsetRef = useRef<number>(0);

    useEffect(() => {
        pendingPostsRef.current = pendingPosts;
    }, [pendingPosts]);

    const handleRevealNewPosts = useCallback(() => {
        const toPrepend = pendingPostsRef.current;
        if (toPrepend.length === 0) return;

        queryClient.setQueryData<InfiniteData<{ data: Post[]; meta: PageMeta }>>(
            queryKeys.feed(),
            (old) => {
                if (!old || !old.pages || old.pages.length === 0) return old;
                const [firstPage, ...rest] = old.pages;
                const existingIds = new Set(firstPage.data.map((p) => p.id));
                const newItems = toPrepend.filter((p) => !existingIds.has(p.id));

                return {
                    ...old,
                    pages: [
                        {
                            ...firstPage,
                            data: [...newItems, ...firstPage.data],
                        },
                        ...rest,
                    ],
                };
            }
        );

        setPendingPosts([]);
        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, [queryClient]);

    useEffect(() => {
        return subscribeFeedScrollToTop(() => setScrollToTopPending(true));
    }, []);

    useEffect(() => {
        return subscribePostCreated((newPost) => {
            if (!newPost?.id) return;

            const alreadyInFeed = posts.some((p) => p.id === newPost.id);
            const alreadyPending = pendingPostsRef.current.some((p) => p.id === newPost.id);
            if (alreadyInFeed || alreadyPending) return;

            if (scrollOffsetRef.current > 80) {
                setPendingPosts((prev) => {
                    if (prev.some((p) => p.id === newPost.id)) return prev;
                    return [newPost, ...prev];
                });
            } else {
                queryClient.setQueryData<InfiniteData<{ data: Post[]; meta: PageMeta }>>(
                    queryKeys.feed(),
                    (old) => {
                        if (!old || !old.pages || old.pages.length === 0) return old;
                        const [firstPage, ...rest] = old.pages;
                        if (firstPage.data.some((p) => p.id === newPost.id)) return old;
                        return {
                            ...old,
                            pages: [
                                {
                                    ...firstPage,
                                    data: [newPost, ...firstPage.data],
                                },
                                ...rest,
                            ],
                        };
                    }
                );
            }
        });
    }, [posts, queryClient]);

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
        <View className="flex-1">
            {pendingPosts.length > 0 && (
                <View
                    pointerEvents="box-none"
                    className="absolute top-3 left-0 right-0 z-30 items-center pointer-events-box-none"
                >
                    <Pressable
                        onPress={handleRevealNewPosts}
                        accessibilityRole="button"
                        accessibilityLabel={`Show ${pendingPosts.length} new ${
                            pendingPosts.length === 1 ? "post" : "posts"
                        }`}
                        className="overflow-hidden rounded-full active:opacity-90 active:scale-95"
                        style={{
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: isDark ? 0.4 : 0.25,
                            shadowRadius: 8,
                            elevation: 6,
                        }}
                    >
                        <LinearGradient
                            colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingHorizontal: 16,
                                paddingVertical: 9,
                                gap: 6,
                            }}
                        >
                            <ArrowUp size={16} color={colors.buttonGradientText} strokeWidth={2.5} />
                            <Text
                                className="text-label-md font-semibold"
                                style={{ color: colors.buttonGradientText }}
                            >
                                {pendingPosts.length} New{" "}
                                {pendingPosts.length === 1 ? "Post" : "Posts"}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </View>
            )}

            <FlatList
                ref={listRef}
                data={posts}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerClassName="gap-4 px-4 py-4"
                ListHeaderComponent={<CreatePost />}
                renderItem={({ item }) => <PostCard post={item} />}
                onScroll={(e) => {
                    const y = e.nativeEvent.contentOffset.y;
                    scrollOffsetRef.current = y;
                    if (y <= 10 && pendingPostsRef.current.length > 0) {
                        handleRevealNewPosts();
                    }
                }}
                scrollEventThrottle={16}
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
        </View>
    );
}
