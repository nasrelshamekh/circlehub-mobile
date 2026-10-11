import { ScrollView, View } from "react-native";

import PostCardSkeleton from "@/components/skeletons/postcardskeleton";
import Skeleton from "@/components/ui/skeleton";

const COMMENT_PLACEHOLDERS = 2;

export default function PostDetailsSkeleton() {
    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="p-4 pb-10"
            scrollEnabled={false}
        >
            <PostCardSkeleton />

            <View className="my-2 rounded-lg bg-surface-lowest p-5 gap-4">
                <Skeleton className="h-5 w-28 rounded-md" />

                <View className="flex-row items-start gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-12 flex-1 rounded-2xl" />
                </View>

                <Skeleton className="h-9 w-20 self-end rounded-full" />

                <View className="gap-4">
                    {Array.from(
                        { length: COMMENT_PLACEHOLDERS },
                        (_, index) => (
                            <View key={index} className="flex-row gap-3">
                                <Skeleton className="h-9 w-9 rounded-full" />

                                <View className="flex-1 rounded-2xl bg-surface-low p-3 gap-2">
                                    <Skeleton className="h-4 w-32 rounded-md" />
                                    <Skeleton className="h-3 w-full rounded-md" />
                                    <Skeleton className="h-3 w-3/4 rounded-md" />
                                </View>
                            </View>
                        )
                    )}
                </View>
            </View>
        </ScrollView>
    );
}
