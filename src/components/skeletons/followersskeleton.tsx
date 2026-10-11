import { ScrollView, View } from "react-native";

import FollowUserCardSkeleton from "@/components/skeletons/followusercardskeleton";
import Skeleton from "@/components/ui/skeleton";

const CARD_PLACEHOLDERS = 3;

export default function FollowersSkeleton() {
    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="p-4 pb-8"
            className="flex-1"
            scrollEnabled={false}
        >
            <View className="gap-4">
                <View className="gap-2">
                    <Skeleton className="h-6 w-40 rounded-md" />
                    <Skeleton className="h-4 w-56 rounded-md" />
                </View>

                <Skeleton className="h-14 w-full rounded-2xl" />

                {Array.from({ length: CARD_PLACEHOLDERS }, (_, index) => (
                    <FollowUserCardSkeleton key={index} />
                ))}
            </View>
        </ScrollView>
    );
}
