import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function ProfileSkeleton() {
    return (
        <View>
            <Skeleton className="h-56 w-full" />

            <View className="px-4">
                <View className="-mt-2.5 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                    <Skeleton className="h-24 w-24 rounded-full" />

                    <View className="mt-3 gap-2.5">
                        <Skeleton className="h-6 w-1/2 rounded-md" />
                        <Skeleton className="h-4 w-3/4 rounded-md" />
                        <Skeleton className="h-4 w-2/3 rounded-md" />
                    </View>
                </View>

                <View className="mt-4 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                    <View className="gap-3">
                        <Skeleton className="h-5 w-2/3 rounded-md" />
                        <Skeleton className="h-4 w-full rounded-md" />
                        <Skeleton className="h-4 w-5/6 rounded-md" />
                    </View>
                </View>

                <View className="mt-4 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                    <View className="gap-3">
                        <Skeleton className="h-5 w-1/2 rounded-md" />
                        <Skeleton className="h-4 w-full rounded-md" />
                        <Skeleton className="h-4 w-2/3 rounded-md" />
                    </View>
                </View>
            </View>
        </View>
    );
}
