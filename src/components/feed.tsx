import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

import CreatePost from "@/components/createpost";
import PostCard from "@/components/postcard";
import usePosts from "@/hooks/usePosts";

export default function Feed() {
    const { posts, loading, error, refresh } = usePosts();

    // Loads on first focus and re-fetches whenever the feed regains focus
    // (e.g. after composing on the Create tab).
    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Only take over the screen when there is nothing to show; a failed
    // background refresh keeps the posts already on screen.
    if (error && posts.length === 0) {
        return (
            <View className="flex-1 items-center justify-center px-4">
                <Text className="text-body-md text-error">
                    {error}
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
        />
    );
}
