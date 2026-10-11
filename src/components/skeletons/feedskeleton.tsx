import { View } from "react-native";

import CreatePostSkeleton from "@/components/skeletons/createpostskeleton";
import PostCardSkeleton from "@/components/skeletons/postcardskeleton";

const POST_PLACEHOLDERS = 3;

export default function FeedSkeleton() {
    return (
        <View className="px-4 py-4 gap-4">
            <CreatePostSkeleton />

            {Array.from({ length: POST_PLACEHOLDERS }, (_, index) => (
                <PostCardSkeleton key={index} />
            ))}
        </View>
    );
}
