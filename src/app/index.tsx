import { Redirect } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LandingFeatures from "@/components/landing/landingfeatures";
import LandingFooter from "@/components/landing/landingfooter";
import LandingHero from "@/components/landing/landinghero";
import { useAuth } from "@/context/authcontext";

export default function Landing() {
    const { status } = useAuth();

    if (status === "authenticated") {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low">
            <ScrollView showsVerticalScrollIndicator={false}>
                <LandingHero />
                <LandingFeatures />
                <LandingFooter />
            </ScrollView>
        </SafeAreaView>
    );
}

