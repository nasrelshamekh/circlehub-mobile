import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import FollowersScreen from "@/components/followers/followersscreen";
import Header from "@/components/header";
import { useAuth } from "@/context/authcontext";

export default function Followers() {
    const { user } = useAuth();
    const { tab } = useLocalSearchParams<{ tab?: string }>();
    const initialTab = tab === "following" ? "following" : "followers";

    return (
        <View className="flex-1 bg-surface-low">
            <Header />
            <FollowersScreen
                key={initialTab}
                username={user?.username ?? ""}
                initialTab={initialTab}
            />
        </View>
    );
}
