import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
    AlertCircle,
    Eye,
    EyeOff,
    LoaderCircle,
    LogIn,
} from "lucide-react-native";
import { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resendVerification } from "@/api/auth";
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
    const [showPassword, setShowPassword] = useState(false);
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

    // Resend needs an email, but this field also accepts a username. Only offer
    // "Resend" when we actually have something email-shaped (either what they
    // typed or the email handed over from the register screen).
    const trimmedIdentifier = usernameOrEmail.trim().toLowerCase();
    const prefilledEmail =
        typeof params.email === "string" ? params.email.toLowerCase() : "";
    const resendEmail = trimmedIdentifier.includes("@")
        ? trimmedIdentifier
        : prefilledEmail;

    async function handleResend(email: string) {
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
        }
    }

    async function onSubmit() {
        if (submitting) {
            return;
        }

        setFormError(null);

        if (!validate()) {
            return;
        }

        setSubmitting(true);

        try {
            await signIn(usernameOrEmail.trim().toLowerCase(), password);

            router.replace("/(tabs)");
        } catch (error) {
            if (error instanceof ApiError && error.isEmailUnverified) {
                const email = resendEmail;

                Alert.alert(
                    "Email not verified",
                    error.message,
                    email
                        ? [
                              { text: "Not now", style: "cancel" },
                              {
                                  text: "Resend email",
                                  onPress: () => handleResend(email),
                              },
                          ]
                        : [{ text: "OK" }]
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
        <SafeAreaView className="flex-1 bg-surface-low">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: "center",
                        padding: 24,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="w-full max-w-lg self-center">
                        <View className="mb-8 items-center">
                            <Image
                                source={require("@/assets/images/circlehub-logo.png")}
                                className="mb-8 h-16 w-[244px]"
                                resizeMode="contain"
                            />

                            <Text className="text-headline-md font-semibold text-text-primary">
                                Welcome back
                            </Text>

                            <Text className="mt-2 text-body-sm text-text-secondary">
                                Sign in to continue to your CircleHub feed.
                            </Text>
                        </View>

                        <View className="gap-5">
                            <View className="gap-3">
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Email or Username
                                </Text>

                                <TextInput
                                    value={usernameOrEmail}
                                    onChangeText={(value) => {
                                        setUsernameOrEmail(value);
                                        setFieldErrors((prev) => ({
                                            ...prev,
                                            usernameOrEmail: undefined,
                                        }));
                                    }}
                                    placeholder="username or you@example.com"
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="username"
                                    className={
                                        fieldErrors.usernameOrEmail
                                            ? "rounded-xl border border-error bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                            : "rounded-xl border border-border bg-surface-lowest px-4 py-3 text-body-sm text-text-primary"
                                    }
                                />

                                {fieldErrors.usernameOrEmail && (
                                    <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                        {fieldErrors.usernameOrEmail}
                                    </Text>
                                )}
                            </View>

                            <View className="gap-3">
                                <Text className="text-label-md font-semibold text-text-primary">
                                    Password
                                </Text>

                                <View
                                    className={
                                        fieldErrors.password
                                            ? "flex-row items-center rounded-xl border border-error bg-surface-lowest px-4"
                                            : "flex-row items-center rounded-xl border border-border bg-surface-lowest px-4"
                                    }
                                >
                                    <TextInput
                                        value={password}
                                        onChangeText={(value) => {
                                            setPassword(value);
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                password: undefined,
                                            }));
                                        }}
                                        placeholder="Enter your password"
                                        placeholderTextColor={colors.textSecondary}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoComplete="password"
                                        className="min-w-0 flex-1 py-3 text-body-sm text-text-primary"
                                    />

                                    <Pressable
                                        onPress={() =>
                                            setShowPassword((current) => !current)
                                        }
                                        className="ml-3 shrink-0"
                                        accessibilityLabel={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff
                                                size={18}
                                                color={colors.textSecondary}
                                            />
                                        ) : (
                                            <Eye
                                                size={18}
                                                color={colors.textSecondary}
                                            />
                                        )}
                                    </Pressable>
                                </View>

                                {fieldErrors.password && (
                                    <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                        {fieldErrors.password}
                                    </Text>
                                )}
                            </View>

                            {formError && (
                                <View className="flex-row items-center gap-1.5 rounded-xl bg-error-container px-4 py-3">
                                    <AlertCircle
                                        size={16}
                                        color={isDark ? "#ffb4ab" : "#ba1a1a"}
                                    />

                                    <Text className="flex-1 text-label-sm text-error">
                                        {formError}
                                    </Text>
                                </View>
                            )}

                            <Pressable
                                onPress={onSubmit}
                                disabled={submitting}
                                className="overflow-hidden rounded-xl"
                            >
                                <LinearGradient
                                    colors={[
                                        colors.primaryGradientStart,
                                        colors.primaryGradientEnd,
                                    ]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        paddingHorizontal: 20,
                                        paddingVertical: 16,
                                        opacity: submitting ? 0.6 : 1,
                                    }}
                                >
                                    {submitting ? (
                                        <LoaderCircle
                                            size={18}
                                            color={colors.buttonGradientText}
                                        />
                                    ) : (
                                        <LogIn
                                            size={18}
                                            color={colors.buttonGradientText}
                                        />
                                    )}

                                    <Text
                                        className="text-body-md font-semibold"
                                        style={{
                                            color: colors.buttonGradientText,
                                        }}
                                    >
                                        {submitting ? "Signing In..." : "Sign In"}
                                    </Text>
                                </LinearGradient>
                            </Pressable>
                        </View>

                        <Text className="mt-6 text-center text-body-sm text-text-secondary">
                            New to CircleHub?{" "}
                            <Text
                                className="font-semibold text-primary"
                                onPress={() =>
                                    router.push("/(auth)/register")
                                }
                            >
                                Create an account
                            </Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}