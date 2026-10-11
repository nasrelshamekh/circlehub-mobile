import { router, useLocalSearchParams } from "expo-router";
import { LoaderCircle, LogIn } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { AuthHeader, AuthLayout } from "@/components/auth/authlayout";
import PasswordField from "@/components/auth/passwordfield";
import FormError from "@/components/ui/formerror";
import GradientButton from "@/components/ui/gradientbutton";
import TextField from "@/components/ui/textfield";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import { ApiError } from "@/types/api";
import { themeColors } from "@/theme/colors";

type FieldErrors = {
    usernameOrEmail?: string;
    password?: string;
};

export default function Login() {
    const { isDark } = useTheme();
    const { signIn } = useAuth();
    const params = useLocalSearchParams<{ email?: string }>();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [usernameOrEmail, setUsernameOrEmail] = useState(
        typeof params.email === "string" ? params.email : ""
    );
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function validate() {
        const errors: FieldErrors = {};

        if (!usernameOrEmail.trim()) {
            errors.usernameOrEmail = "Enter your username or email";
        }

        if (!password) {
            errors.password = "Password is required";
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    }

    async function onSubmit() {
        if (submitting) return;

        setFormError(null);

        if (!validate()) return;

        setSubmitting(true);

        try {
            await signIn(usernameOrEmail.trim().toLowerCase(), password);

            router.replace("/(tabs)");
        } catch (error) {
            if (error instanceof ApiError && error.isEmailUnverified) {
                const identifier = usernameOrEmail.trim().toLowerCase();

                // Web parity: unverified sign-ins go to the verify-email screen.
                router.push(
                    identifier.includes("@")
                        ? {
                              pathname: "/(auth)/verify-email",
                              params: { email: identifier },
                          }
                        : "/(auth)/verify-email"
                );

                return;
            }

            setFormError(
                error instanceof ApiError ? error.message : "Could not sign in"
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthLayout>
            <AuthHeader
                title="Welcome back"
                subtitle="Sign in to continue to your CircleHub feed."
            />

            <View className="gap-5">
                <TextField
                    label="Email or Username"
                    value={usernameOrEmail}
                    onChangeText={(value) => {
                        setUsernameOrEmail(value);
                        setFieldErrors((prev) => ({
                            ...prev,
                            usernameOrEmail: undefined,
                        }));
                    }}
                    placeholder="username or you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    error={fieldErrors.usernameOrEmail}
                />

                <PasswordField
                    value={password}
                    onChangeText={(value) => {
                        setPassword(value);
                        setFieldErrors((prev) => ({
                            ...prev,
                            password: undefined,
                        }));
                    }}
                    placeholder="Enter your password"
                    error={fieldErrors.password}
                />

                <Text
                    className="-mt-2 self-end text-label-sm font-semibold text-primary"
                    onPress={() => router.push("/(auth)/forgot-password")}
                >
                    Forgot password?
                </Text>

                {formError ? <FormError message={formError} /> : null}

                <GradientButton
                    onPress={onSubmit}
                    disabled={submitting}
                    icon={
                        submitting ? (
                            <LoaderCircle
                                size={18}
                                color={colors.buttonGradientText}
                            />
                        ) : (
                            <LogIn size={18} color={colors.buttonGradientText} />
                        )
                    }
                    label={submitting ? "Signing In..." : "Sign In"}
                    className="rounded-xl"
                    contentStyle={{
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                    }}
                    textClassName="text-body-md font-semibold"
                />
            </View>

            <Text className="mt-6 text-center text-body-sm text-text-secondary">
                New to CircleHub?{" "}
                <Text
                    className="font-semibold text-primary"
                    onPress={() => router.push("/(auth)/register")}
                >
                    Create an account
                </Text>
            </Text>
        </AuthLayout>
    );
}
