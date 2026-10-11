import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function ExplorePostCardSkeleton() {
    return (
        <View className="my-2 overflow-hidden rounded-lg bg-surface-lowest">
            <Skeleton className="h-40 w-full" />

            <View className="p-5 gap-4">
                <View className="flex-row items-start gap-3">
                    <Skeleton className="h-11 w-11 rounded-full" />

                    <View className="flex-1 gap-1.5">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <Skeleton className="h-3 w-40 rounded-md" />
                    </View>
                </View>

                <View className="gap-2">
                    <Skeleton className="h-3 w-full rounded-md" />
                    <Skeleton className="h-3 w-11/12 rounded-md" />
                    <Skeleton className="h-3 w-3/4 rounded-md" />
                </View>

                <View className="flex-row items-center justify-between pt-3">
                    <Skeleton className="h-3 w-32 rounded-md" />

                    <View className="flex-row items-center gap-4">
                        <Skeleton className="h-4 w-10 rounded-md" />
                        <Skeleton className="h-4 w-10 rounded-md" />
                    </View>
                </View>
            </View>
        </View>
    );
}
