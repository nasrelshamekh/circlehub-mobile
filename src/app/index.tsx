import LandingFeatures from "@/components/landing/landingfeatures";
import LandingFooter from "@/components/landing/landingfooter";
import LandingHero from "@/components/landing/landinghero";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Landing() {
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

