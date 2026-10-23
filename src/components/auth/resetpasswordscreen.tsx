import { router } from "expo-router";
import { CheckCircle2, ShieldAlert } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { resetPassword } from "@/api/auth";
import { AuthHeader, AuthLayout } from "@/components/auth/authlayout";
import PasswordField from "@/components/auth/passwordfield";
import FormError from "@/components/ui/formerror";
import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import {
    validateResetPassword,
    type ResetPasswordErrors,
} from "@/lib/passwordResetValidation";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

type ResetPasswordScreenProps = {
    userId?: string;
    token?: string;
};

export default function ResetPasswordScreen({
    userId,
    token,
}: ResetPasswordScreenProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const hasParams = Boolean(userId && token);

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<ResetPasswordErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    async function onSubmit() {
        if (submitting) return;

        setFormError(null);

        const errors = validateResetPassword({ password, confirmPassword });
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSubmitting(true);

        try {
            await resetPassword(userId!, token!, password);
            setDone(true);
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : "Could not reset your password"
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (!hasParams) {
        return (
            <AuthLayout>
                <AuthHeader
                    icon={
                        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-surface-low">
                            <ShieldAlert size={36} color={colors.error} />
                        </View>
                    }
                    title="Reset link is invalid"
                    subtitle="This password reset link is missing required information or has expired. Request a new link to continue."
                />

                <GradientButton
                    onPress={() => router.replace("/(auth)/forgot-password")}
                    label="Request a new link"
                    className="rounded-xl"
                    contentStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
                    textClassName="text-body-md font-semibold"
                />
            </AuthLayout>
        );
    }

    if (done) {
        return (
            <AuthLayout>
                <AuthHeader
                    icon={
                        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
                            <CheckCircle2 size={36} color={colors.primary} />
                        </View>
                    }
                    title="Password updated"
                    subtitle="Your password has been reset successfully. You can now sign in with your new password."
                />

                <GradientButton
                    onPress={() => router.replace("/(auth)/login")}
                    label="Go to Sign in"
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
                title="Choose a new password"
                subtitle="Pick a strong password you haven't used before."
            />

            <View className="gap-5">
                <PasswordField
                    label="New password"
                    value={password}
                    onChangeText={(value) => {
                        setPassword(value);
                        setFieldErrors((prev) => ({
                            ...prev,
                            password: undefined,
                        }));
                    }}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    error={fieldErrors.password}
                />

                <PasswordField
                    label="Confirm password"
                    value={confirmPassword}
                    onChangeText={(value) => {
                        setConfirmPassword(value);
                        setFieldErrors((prev) => ({
                            ...prev,
                            confirmPassword: undefined,
                        }));
                    }}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    error={fieldErrors.confirmPassword}
                />

                {formError ? <FormError message={formError} /> : null}

                {formError ? (
                    <Text
                        className="text-center text-body-sm font-semibold text-primary"
                        onPress={() => router.replace("/(auth)/forgot-password")}
                    >
                        Request a new link
                    </Text>
                ) : null}

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
                            <CheckCircle2
                                size={18}
                                color={colors.buttonGradientText}
                            />
                        )
                    }
                    label={submitting ? "Resetting..." : "Reset password"}
                    className="rounded-xl"
                    contentStyle={{
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                    }}
                    textClassName="text-body-md font-semibold"
                />
            </View>
        </AuthLayout>
    );
}
