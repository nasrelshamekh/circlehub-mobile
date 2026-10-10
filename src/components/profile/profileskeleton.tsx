import { View } from "react-native";

/**
 * Loading placeholder for the profile page, following the web app's
 * ProfileSkeleton layout (cover, avatar, name lines, panel cards).
 */
export default function ProfileSkeleton() {
    return (
        <View>
            <View className="h-44 w-full bg-surface-high" />

            <View className="px-4">
                <View className="-mt-12 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                    <View className="-mt-14 h-20 w-20 rounded-full bg-surface-high" />

                    <View style={{ gap: 10 }} className="mt-3">
                        <View className="h-6 w-1/2 rounded-md bg-surface-high" />
                        <View className="h-4 w-3/4 rounded-md bg-surface-high" />
                        <View className="h-4 w-2/3 rounded-md bg-surface-high" />
                    </View>
                </View>

                <View className="mt-4 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                    <View style={{ gap: 12 }}>
                        <View className="h-5 w-2/3 rounded-md bg-surface-high" />
                        <View className="h-4 w-full rounded-md bg-surface-high" />
                        <View className="h-4 w-5/6 rounded-md bg-surface-high" />
                    </View>
                </View>

                <View className="mt-4 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                    <View style={{ gap: 12 }}>
                        <View className="h-5 w-1/2 rounded-md bg-surface-high" />
                        <View className="h-4 w-full rounded-md bg-surface-high" />
                        <View className="h-4 w-2/3 rounded-md bg-surface-high" />
                    </View>
                </View>
            </View>
        </View>
    );
}