import { ScrollView, View } from "react-native";

import PostCardSkeleton from "@/components/skeletons/postcardskeleton";
import Skeleton from "@/components/ui/skeleton";

export default function CommunityDetailsSkeleton() {
    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="pb-10"
            scrollEnabled={false}
        >
            <Skeleton className="mx-4 mt-2 h-40 w-auto rounded-2xl" />

            <View className="-mt-10 mx-4 rounded-2xl bg-surface-lowest p-4 shadow-sm gap-4">
                <View className="flex-row items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-xl" />

                    <View className="flex-1 gap-2">
                        <Skeleton className="h-6 w-40 rounded-md" />
                        <Skeleton className="h-4 w-24 rounded-md" />
                    </View>
                </View>

                <Skeleton className="h-10 w-full rounded-xl" />

                <View className="gap-2">
                    <Skeleton className="h-3 w-full rounded-md" />
                    <Skeleton className="h-3 w-3/4 rounded-md" />
                </View>

                <View className="flex-row gap-4">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                </View>
            </View>

            <View className="mt-4 px-4 gap-4">
                <Skeleton className="h-11 w-full rounded-2xl" />
                <PostCardSkeleton />
                <PostCardSkeleton />
            </View>
        </ScrollView>
    );
}
