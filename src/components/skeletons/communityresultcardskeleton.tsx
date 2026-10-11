import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function CommunityResultCardSkeleton() {
    return (
        <View className="rounded-2xl bg-surface-lowest p-4 shadow-sm gap-3">
            <View className="flex-row items-start gap-4">
                <Skeleton className="h-20 w-20 rounded-lg" />

                <View className="flex-1 gap-2">
                    <View className="flex-row items-start justify-between gap-3">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </View>
                    <Skeleton className="h-3 w-24 rounded-md" />
                </View>
            </View>

            <View className="gap-2">
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-3/4 rounded-md" />
            </View>

            <View className="flex-row gap-4">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
            </View>

            <Skeleton className="h-12 w-full rounded-lg" />

            <View className="flex-row items-center justify-between border-t border-border pt-3">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-xl" />
            </View>
        </View>
    );
}
