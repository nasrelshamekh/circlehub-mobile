import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function CommunitiesListSkeleton() {
    return (
        <View className="flex-1 p-4 gap-6">
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-2">
                    <Skeleton className="h-4 w-56 rounded-md" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                </View>
                <Skeleton className="h-10 w-28 rounded-full" />
            </View>

            <View className="gap-4">
                <Skeleton className="h-5 w-48 rounded-md" />

                <View className="overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
                    <Skeleton className="h-36 w-full" />

                    <View className="p-4 gap-4">
                        <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1 gap-2">
                                <Skeleton className="h-4 w-32 rounded-md" />
                                <Skeleton className="h-3 w-24 rounded-md" />
                            </View>
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </View>

                        <View className="gap-2">
                            <Skeleton className="h-3 w-full rounded-md" />
                            <Skeleton className="h-3 w-3/4 rounded-md" />
                        </View>

                        <View className="flex-row gap-4">
                            <Skeleton className="h-3 w-16 rounded-md" />
                            <Skeleton className="h-3 w-16 rounded-md" />
                            <Skeleton className="h-3 w-16 rounded-md" />
                        </View>

                        <Skeleton className="h-9 w-full rounded-xl" />
                    </View>
                </View>
            </View>

            <View className="gap-4">
                <Skeleton className="h-5 w-52 rounded-md" />

                <View className="rounded-2xl bg-surface-lowest p-4 gap-3">
                    <View className="flex-row items-start gap-3">
                        <Skeleton className="h-16 w-16 rounded-lg" />
                        <View className="flex-1 gap-2">
                            <Skeleton className="h-4 w-32 rounded-md" />
                            <Skeleton className="h-3 w-24 rounded-md" />
                            <Skeleton className="h-3 w-20 rounded-md" />
                        </View>
                    </View>
                    <Skeleton className="h-9 w-full rounded-xl" />
                </View>
            </View>
        </View>
    );
}
