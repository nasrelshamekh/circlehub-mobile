import { View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

export default function ConversationsSkeleton() {
    return (
        <View className="gap-3 px-4 pt-2">
            {Array.from({ length: 6 }, (_, index) => (
                <View
                    key={index}
                    className="flex-row items-center gap-3 rounded-2xl bg-surface-lowest p-4"
                >
                    <Skeleton className="h-12 w-12 rounded-full" />

                    <View className="flex-1 gap-2">
                        <View className="flex-row items-center justify-between gap-2">
                            <Skeleton className="h-4 w-32 rounded-md" />
                            <Skeleton className="h-3 w-12 rounded-md" />
                        </View>
                        <Skeleton className="h-3 w-48 rounded-md" />
                    </View>
                </View>
            ))}
        </View>
    );
}
