import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function ManageCommunitySkeleton() {
    return (
        <View className="gap-4 p-4">
            <Skeleton className="h-7 w-56 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-md" />

            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
        </View>
    );
}
