import { View } from "react-native";

import ExploreScreen from "@/components/explore/explorescreen";
import Header from "@/components/header";

export default function Explore() {
    return (
        <View className="flex-1 bg-surface-low">
            <Header />
            <ExploreScreen />
        </View>
    );
}
