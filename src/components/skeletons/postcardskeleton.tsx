import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function PostCardSkeleton() {
    return (
        <View className="my-2 rounded-lg bg-surface-lowest p-5 gap-4">
            <View className="flex-row items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />

                <View className="flex-1 gap-1.5">
                    <Skeleton className="h-4 w-36 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                </View>
            </View>

            <View className="gap-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
            </View>
        </View>
    );
}
