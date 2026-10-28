import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function FollowUserCardSkeleton() {
    return (
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm gap-3">
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 flex-row items-start gap-3">
                    <Skeleton className="h-14 w-14 rounded-full" />

                    <View className="flex-1 gap-1.5">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <Skeleton className="h-3 w-24 rounded-md" />
                        <Skeleton className="h-3 w-20 rounded-md" />
                    </View>
                </View>

                <Skeleton className="h-10 w-10 rounded-full" />
            </View>

            <Skeleton className="h-4 w-full rounded-md" />

            <View className="flex-row gap-4">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
            </View>
        </View>
    );
}
