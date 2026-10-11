import { View } from "react-native";

import Header from "@/components/header";
import ProfileScreen from "@/components/profile/profilescreen";
import { useAuth } from "@/context/authcontext";

export default function Profile() {
    const { user } = useAuth();

    return (
        <View className="flex-1 bg-surface-low">
            <Header />
            <ProfileScreen username={user?.username ?? ""} />
        </View>
    );
}
