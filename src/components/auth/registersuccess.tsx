import { router } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resendVerification } from "@/api/auth";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

type RegisterSuccessProps = {
    email: string;
    message: string;
};

export default function RegisterSuccess({
    email,
    message,
}: RegisterSuccessProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const [resending, setResending] = useState(false);

    // The account is unverified, so resend never routes to the feed.
    async function handleResend() {
        if (!email || resending) return;

        setResending(true);

        try {
            const response = await resendVerification(email);

            Alert.alert("Verification email sent", response.message);
        } catch (error) {
            Alert.alert(
                "Couldn't resend email",
                error instanceof ApiError
                    ? error.message
                    : "Please try again in a moment."
            );
        } finally {
            setResending(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-low">
            <View className="flex-1 justify-center px-6">
                <View className="w-full max-w-lg self-center items-center">
                    <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
                        <MailCheck size={30} color={colors.primary} />
                    </View>

                    <Text className="text-center text-headline-md font-semibold text-text-primary">
                        Check your inbox
                    </Text>

                    <Text className="mt-3 text-center text-body-sm text-text-secondary">
                        {message}
                    </Text>

                    {!!email && (
                        <Text className="mt-1 text-center text-body-sm font-semibold text-text-primary">
                            {email}
                        </Text>
                    )}

                    <Pressable
                        onPress={handleResend}
                        disabled={resending}
                        className="mt-8 w-full flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface-lowest px-5 py-4"
                        style={{ opacity: resending ? 0.6 : 1 }}
                    >
                        <Text className="text-body-md font-semibold text-text-primary">
                            {resending ? "Sending..." : "Resend email"}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() =>
                            router.replace({
                                pathname: "/(auth)/login",
                                params: { email },
                            })
                        }
                        className="mt-4"
                    >
                        <Text className="text-body-sm font-semibold text-primary">
                            Back to sign in
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
