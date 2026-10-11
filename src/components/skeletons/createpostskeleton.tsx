import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function CreatePostSkeleton() {
    return (
        <View className="my-2 rounded-lg bg-surface-lowest p-4">
            <View className="flex-row items-center">
                <Skeleton className="mr-3 h-11 w-11 rounded-full" />
                <Skeleton className="h-11 flex-1 rounded-full" />
                <Skeleton className="ml-3 h-6 w-6 rounded-full" />
            </View>
        </View>
    );
}
