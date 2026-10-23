import { ScrollView, View } from "react-native";

import Skeleton from "@/components/ui/skeleton";

const NOTIFICATION_PLACEHOLDERS = 4;

export default function NotificationsSkeleton() {
    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="px-4 pb-8 pt-2"
            className="flex-1"
            scrollEnabled={false}
        >
            <View className="gap-2">
                {Array.from({ length: NOTIFICATION_PLACEHOLDERS }, (_, index) => (
                    <View
                        key={index}
                        className="flex-row items-start gap-3 rounded-xl bg-surface-lowest p-4"
                    >
                        <Skeleton className="mt-0.5 h-10 w-10 rounded-full" />
                        <View className="flex-1 gap-2">
                            <Skeleton className="h-4 w-full rounded-md" />
                            <Skeleton className="h-3 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-16 rounded-md" />
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}
