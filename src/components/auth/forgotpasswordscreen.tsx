import { router } from "expo-router";
import { MailCheck, Send } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { forgotPassword } from "@/api/auth";
import { AuthHeader, AuthLayout } from "@/components/auth/authlayout";
import FormError from "@/components/ui/formerror";
import GradientButton from "@/components/ui/gradientbutton";
import TextField from "@/components/ui/textfield";
import { useTheme } from "@/context/themecontext";
import {
    validateForgotPassword,
    type ForgotPasswordErrors,
} from "@/lib/passwordResetValidation";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function ForgotPasswordScreen() {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const [email, setEmail] = useState("");
    const [fieldErrors, setFieldErrors] = useState<ForgotPasswordErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [sentEmail, setSentEmail] = useState("");

    const trimmedEmail = email.trim();

    async function onSubmit() {
        if (submitting) return;

        setFormError(null);

        const errors = validateForgotPassword({ email });
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSubmitting(true);

        try {
            await forgotPassword(trimmedEmail.toLowerCase());
            setSentEmail(trimmedEmail);
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : "Could not send the reset link"
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (sentEmail) {
        return (
            <AuthLayout>
                <AuthHeader
                    icon={
                        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
                            <MailCheck size={36} color={colors.primary} />
                        </View>
                    }
                    title="Check your email"
                    subtitle={`If an account exists for ${sentEmail}, we've sent a password reset link.`}
                />

                <GradientButton
                    onPress={() => router.replace("/(auth)/login")}
                    label="Back to Sign in"
                    className="rounded-xl"
                    contentStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
                    textClassName="text-body-md font-semibold"
                />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <AuthHeader
                title="Forgot your password?"
                subtitle="Enter the email you use for CircleHub and we'll send you a reset link."
            />

            <View className="gap-5">
                <TextField
                    label="Email"
                    value={email}
                    onChangeText={(value) => {
                        setEmail(value);
                        setFieldErrors((prev) => ({
                            ...prev,
                            email: undefined,
                        }));
                    }}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    error={fieldErrors.email}
                />

                {formError ? <FormError message={formError} /> : null}

                <GradientButton
                    onPress={onSubmit}
                    disabled={submitting}
                    icon={
                        submitting ? (
                            <ActivityIndicator
                                size="small"
                                color={colors.buttonGradientText}
                            />
                        ) : (
                            <Send size={18} color={colors.buttonGradientText} />
                        )
                    }
                    label={submitting ? "Sending..." : "Send reset link"}
                    className="rounded-xl"
                    contentStyle={{
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                    }}
                    textClassName="text-body-md font-semibold"
                />
            </View>

            <Text className="mt-6 text-center text-body-sm text-text-secondary">
                Remembered it?{" "}
                <Text
                    className="font-semibold text-primary"
                    onPress={() => router.replace("/(auth)/login")}
                >
                    Back to sign in
                </Text>
            </Text>
        </AuthLayout>
    );
}
