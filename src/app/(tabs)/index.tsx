import Feed from "@/components/feed";
import Header from "@/components/header";
import { View } from "react-native";

export default function Home() {
    return (
        <View className="flex-1 bg-surface-low">
            <Header />
            <Feed />
        </View>
    );
}