import CreatePost from "@/components/createpost";
import PostCard from "@/components/postcard";
import usePosts from "@/hooks/usePosts";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

export default function Feed() {
    const { posts, loading, error } = usePosts();

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error) {
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