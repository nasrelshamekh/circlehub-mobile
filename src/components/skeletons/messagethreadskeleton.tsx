import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function MessageThreadSkeleton() {
    return (
        <View className="flex-1 justify-end px-4 pb-6 pt-4 gap-4 bg-surface-low">
            <View className="flex-row items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-12 w-48 rounded-2xl rounded-bl-md" />
            </View>

            <View className="flex-row items-end justify-end gap-2">
                <Skeleton className="h-10 w-36 rounded-2xl rounded-br-md" />
            </View>

            <View className="flex-row items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-16 w-56 rounded-2xl rounded-bl-md" />
            </View>

            <View className="flex-row items-end justify-end gap-2">
                <Skeleton className="h-12 w-44 rounded-2xl rounded-br-md" />
            </View>

            <View className="flex-row items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-2xl rounded-bl-md" />
            </View>
        </View>
    );
}
