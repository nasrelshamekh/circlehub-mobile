import { router } from "expo-router";
import { CalendarDays, ChevronDown, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { AuthHeader, AuthLayout } from "@/components/auth/authlayout";
import GenderModal, { genderLabel } from "@/components/auth/gendermodal";
import PasswordField from "@/components/auth/passwordfield";
import DatePicker, {
    formatDisplayDate,
    toApiDate,
} from "@/components/ui/datepicker";
import FormError from "@/components/ui/formerror";
import GradientButton from "@/components/ui/gradientbutton";
import TextField from "@/components/ui/textfield";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import {
    RegisterFieldErrors,
    validateRegister,
} from "@/lib/registerValidation";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

type RegisterFormProps = {
    onRegistered: (email: string, message: string) => void;
};

export default function RegisterForm({ onRegistered }: RegisterFormProps) {
    const { isDark } = useTheme();
    const { signUp } = useAuth();

    const colors = isDark ? themeColors.dark : themeColors.light;

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [gender, setGender] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [location, setLocation] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [genderPickerOpen, setGenderPickerOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function clearFieldError(field: keyof RegisterFieldErrors) {
        setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    }

    function validate() {
        const errors = validateRegister({
            name,
            username,
            jobTitle,
            gender,
            dateOfBirth,
            location,
            email,
            password,
        });

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    }

    async function onSubmit() {
        if (submitting) return;

        setFormError(null);

        if (!validate()) return;

        if (!dateOfBirth) return;

        setSubmitting(true);

        try {
            const payload = {
                name: name.trim(),
                username: username.trim().toLowerCase(),
                jobTitle: jobTitle.trim(),
                gender: gender,
                dateOfBirth: toApiDate(dateOfBirth),
                location: location.trim(),
                email: email.trim().toLowerCase(),
                password,
            };

            const message = await signUp(payload);

            onRegistered(
                payload.email,
                message || "Check your inbox to verify your email."
            );
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : "Could not create account"
            );
        } finally {
            setSubmitting(false);
        }
    }

    function confirmDate(date: Date) {
        setDateOfBirth(date);
        clearFieldError("dateOfBirth");
        setDatePickerOpen(false);
    }

    return (
        <>
            <AuthLayout>
                <AuthHeader
                    title="Create your account"
                    subtitle="Join CircleHub and start building your network."
                />

                <View className="gap-4">
                    <TextField
                        label="Full Name"
                        value={name}
                        onChangeText={(value) => {
                            setName(value);
                            clearFieldError("name");
                        }}
                        placeholder="Your name"
                        autoCapitalize="words"
                        error={fieldErrors.name}
                    />

                    <TextField
                        label="Username"
                        value={username}
                        onChangeText={(value) => {
                            setUsername(value);
                            clearFieldError("username");
                        }}
                        placeholder="Choose a username"
                        autoCapitalize="none"
                        autoCorrect={false}
                        error={fieldErrors.username}
                        hint={
                            "Your username can't be changed after you create your account."
                        }
                    />

                    <TextField
                        label="Job Title"
                        value={jobTitle}
                        onChangeText={(value) => {
                            setJobTitle(value);
                            clearFieldError("jobTitle");
                        }}
                        placeholder="Your job title"
                        error={fieldErrors.jobTitle}
                    />

                    <View className="flex-row gap-4">
                        <View className="flex-1 gap-3">
                            <Text className="text-label-md font-semibold text-text-primary">
                                Gender
                            </Text>

                            <Pressable
                                onPress={() => setGenderPickerOpen(true)}
                                accessibilityRole="button"
                                accessibilityLabel="Select gender"
                                className={
                                    fieldErrors.gender
                                        ? "flex-row items-center justify-between rounded-xl border border-error bg-surface-lowest px-4 py-3"
                                        : "flex-row items-center justify-between rounded-xl border border-border bg-surface-lowest px-4 py-3"
                                }
                            >
                                <Text
                                    className={
                                        gender
                                            ? "text-body-sm text-text-primary"
                                            : "text-body-sm text-text-secondary"
                                    }
                                >
                                    {genderLabel(gender)}
                                </Text>

                                <ChevronDown
                                    size={18}
                                    color={colors.textSecondary}
                                />
                            </Pressable>

                            {fieldErrors.gender && (
                                <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                    {fieldErrors.gender}
                                </Text>
                            )}
                        </View>

                        <View className="flex-1 gap-3">
                            <Text className="text-label-md font-semibold text-text-primary">
                                Birthdate
                            </Text>

                            <Pressable
                                onPress={() => setDatePickerOpen(true)}
                                accessibilityRole="button"
                                accessibilityLabel="Select birthdate"
                                className={
                                    fieldErrors.dateOfBirth
                                        ? "flex-row items-center justify-between rounded-xl border border-error bg-surface-lowest px-4 py-3"
                                        : "flex-row items-center justify-between rounded-xl border border-border bg-surface-lowest px-4 py-3"
                                }
                            >
                                <Text
                                    className={
                                        dateOfBirth
                                            ? "text-body-sm text-text-primary"
                                            : "text-body-sm text-text-secondary"
                                    }
                                >
                                    {dateOfBirth
                                        ? formatDisplayDate(dateOfBirth)
                                        : "DD-MM-YYYY"}
                                </Text>

                                <CalendarDays
                                    size={18}
                                    color={colors.textSecondary}
                                />
                            </Pressable>

                            {fieldErrors.dateOfBirth && (
                                <Text className="flex-row items-center gap-1.5 text-label-sm text-error">
                                    {fieldErrors.dateOfBirth}
                                </Text>
                            )}
                        </View>
                    </View>

                    <TextField
                        label="Location"
                        value={location}
                        onChangeText={(value) => {
                            setLocation(value);
                            clearFieldError("location");
                        }}
                        placeholder="City, Country"
                        error={fieldErrors.location}
                    />

                    <TextField
                        label="Email"
                        value={email}
                        onChangeText={(value) => {
                            setEmail(value);
                            clearFieldError("email");
                        }}
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        error={fieldErrors.email}
                    />

                    <PasswordField
                        value={password}
                        onChangeText={(value) => {
                            setPassword(value);
                            clearFieldError("password");
                        }}
                        placeholder="Create a password"
                        error={fieldErrors.password}
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
                                <UserPlus
                                    size={18}
                                    color={colors.buttonGradientText}
                                />
                            )
                        }
                        label={
                            submitting ? "Creating Account..." : "Create Account"
                        }
                        className="rounded-xl"
                        contentStyle={{
                            paddingHorizontal: 20,
                            paddingVertical: 16,
                        }}
                        textClassName="text-body-md font-semibold"
                    />
                </View>

                <Text className="mt-6 text-center text-body-sm text-text-secondary">
                    Already have an account?{" "}
                    <Text
                        className="font-semibold text-primary"
                        onPress={() => router.push("/(auth)/login")}
                    >
                        Sign in
                    </Text>
                </Text>
            </AuthLayout>

            <GenderModal
                visible={genderPickerOpen}
                value={gender}
                onSelect={(value) => {
                    setGender(value);
                    setGenderPickerOpen(false);
                    clearFieldError("gender");
                }}
                onClose={() => setGenderPickerOpen(false)}
            />

            {datePickerOpen && (
                <DatePicker
                    value={dateOfBirth}
                    onConfirm={confirmDate}
                    onClose={() => setDatePickerOpen(false)}
                />
            )}
        </>
    );
}
