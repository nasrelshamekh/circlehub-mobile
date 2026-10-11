import { router } from "expo-router";
import {
    CheckCircle2,
    LoaderCircle,
    MailCheck,
    MailX,
    RefreshCw,
} from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { resendVerification } from "@/api/auth";
import { AuthHeader, AuthLayout } from "@/components/auth/authlayout";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import { useVerifyEmail } from "@/hooks/useVerifyEmail";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

type VerifyEmailScreenProps = {
    userId?: string;
    token?: string;
    initialEmail?: string;
};

export default function VerifyEmailScreen({
    userId,
    token,
    initialEmail = "",
}: VerifyEmailScreenProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const { status, message, hasParams } = useVerifyEmail(userId, token);

    const [email, setEmail] = useState(initialEmail);
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    const trimmedEmail = email.trim();
    const showSuccess = status === "success";
    const showError = status === "error";
    const showVerifying = hasParams && status === "verifying";
    const showPending =
        !hasParams && !showError && !showSuccess && Boolean(trimmedEmail);
    const showMissing = !hasParams && !showError && !showSuccess && !trimmedEmail;

    async function handleResend() {
        if (!trimmedEmail || resending) return;

        setResending(true);

        try {
            const response = await resendVerification(trimmedEmail);
            setResent(true);
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

    function goToSignIn() {
        router.replace(
            trimmedEmail
                ? { pathname: "/(auth)/login", params: { email: trimmedEmail } }
                : "/(auth)/login"
        );
    }

    const title = showSuccess
        ? "You're all set!"
        : showPending
          ? "Check your email"
          : showVerifying
            ? "Verifying your email"
            : "Email verification failed";

    const body = showSuccess
        ? message
        : showPending
          ? `We sent a verification link to ${trimmedEmail}. Open the link in your email to activate your account.`
          : showVerifying
            ? "Please wait a moment while we confirm your email address."
            : message || "This verification link is missing required information.";

    return (
        <AuthLayout>
            <AuthHeader
                icon={
                    <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
                        {showSuccess ? (
                            <CheckCircle2 size={36} color={colors.primary} />
                        ) : showPending ? (
                            <MailCheck size={36} color={colors.primary} />
                        ) : showVerifying ? (
                            <LoaderCircle size={36} color={colors.primary} />
                        ) : (
                            <MailX size={36} color={colors.error} />
                        )}
                    </View>
                }
                title={title}
                subtitle={body}
            />

            <View className="gap-3">
                {showSuccess || showPending ? (
                    <GradientButton
                        onPress={goToSignIn}
                        label="Go to Sign in"
                        className="rounded-xl"
                        contentStyle={{
                            paddingHorizontal: 20,
                            paddingVertical: 16,
                        }}
                        textClassName="text-body-md font-semibold"
                    />
                ) : null}

                {showPending && !resent ? (
                    <Pressable
                        onPress={handleResend}
                        disabled={resending}
                        accessibilityRole="button"
                        accessibilityLabel="Resend verification email"
                        className="flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface-lowest px-5 py-4"
                        style={resending ? { opacity: 0.6 } : undefined}
                    >
                        {resending ? (
                            <LoaderCircle
                                size={18}
                                color={colors.textSecondary}
                            />
                        ) : (
                            <RefreshCw size={18} color={colors.textSecondary} />
                        )}

                        <Text className="text-body-md font-semibold text-text-primary">
                            {resending
                                ? "Sending..."
                                : "Resend verification email"}
                        </Text>
                    </Pressable>
                ) : null}

                {showPending && resent ? (
                    <Text className="text-center text-body-sm text-text-secondary">
                        A new verification link has been sent. Check your inbox.
                    </Text>
                ) : null}

                {(showError || showMissing) && !resent ? (
                    <View className="gap-3">
                        <Text className="text-label-md font-semibold text-text-primary">
                            Request a new link
                        </Text>

                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            autoComplete="email"
                            className="rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                        />

                        <GradientButton
                            onPress={handleResend}
                            disabled={resending || !trimmedEmail}
                            icon={
                                resending ? (
                                    <LoaderCircle
                                        size={18}
                                        color={colors.buttonGradientText}
                                    />
                                ) : (
                                    <RefreshCw
                                        size={18}
                                        color={colors.buttonGradientText}
                                    />
                                )
                            }
                            label={
                                resending
                                    ? "Sending..."
                                    : "Resend verification email"
                            }
                            className="rounded-xl"
                            contentStyle={{
                                paddingHorizontal: 20,
                                paddingVertical: 16,
                            }}
                            textClassName="text-body-md font-semibold"
                        />
                    </View>
                ) : null}

                {(showError || showMissing) && resent ? (
                    <Text className="text-center text-body-sm text-text-secondary">
                        Check your inbox for a new verification link. You can
                        also{" "}
                        <Text
                            className="font-semibold text-primary underline"
                            onPress={() => setResent(false)}
                        >
                            try another email
                        </Text>
                        .
                    </Text>
                ) : null}
            </View>
        </AuthLayout>
    );
}
