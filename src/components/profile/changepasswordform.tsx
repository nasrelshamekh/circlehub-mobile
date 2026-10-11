import { router } from "expo-router";
import { CheckCircle2, LoaderCircle } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { changePassword } from "@/api/auth";
import PasswordField from "@/components/auth/passwordfield";
import FormError from "@/components/ui/formerror";
import GradientButton from "@/components/ui/gradientbutton";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import {
    validateChangePassword,
    type ChangePasswordErrors,
} from "@/lib/changePasswordValidation";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";

export default function ChangePasswordForm() {
    const { isDark } = useTheme();
    const { signOut } = useAuth();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<ChangePasswordErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function clearFeedback(field: keyof ChangePasswordErrors) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        setFormError(null);
    }

    async function onSubmit() {
        if (submitting) return;

        setFormError(null);

        const errors = validateChangePassword({
            currentPassword,
            newPassword,
            confirmPassword,
        });
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSubmitting(true);

        try {
            await changePassword(currentPassword, newPassword);
            // The change revokes every session; drop this one and land on login.
            await signOut();
            router.replace("/(auth)/login");
        } catch (caught) {
            setFormError(
                caught instanceof ApiError
                    ? caught.message
                    : "Could not change your password"
            );
            setSubmitting(false);
        }
    }

    return (
        <View className="gap-5 rounded-2xl bg-surface-lowest p-4">
            <View>
                <Text className="text-title-lg font-semibold text-text-primary">
                    Change Password
                </Text>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    Update the password you use to sign in to CircleHub.
                </Text>
            </View>

            <PasswordField
                label="Current password"
                value={currentPassword}
                onChangeText={(value) => {
                    setCurrentPassword(value);
                    clearFeedback("currentPassword");
                }}
                placeholder="Enter your current password"
                error={fieldErrors.currentPassword}
            />

            <PasswordField
                label="New password"
                value={newPassword}
                onChangeText={(value) => {
                    setNewPassword(value);
                    clearFeedback("newPassword");
                }}
                placeholder="Create a new password"
                autoComplete="new-password"
                error={fieldErrors.newPassword}
            />

            <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={(value) => {
                    setConfirmPassword(value);
                    clearFeedback("confirmPassword");
                }}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                error={fieldErrors.confirmPassword}
            />

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
                        <CheckCircle2
                            size={18}
                            color={colors.buttonGradientText}
                        />
                    )
                }
                label={submitting ? "Updating..." : "Update password"}
                className="rounded-xl"
                contentStyle={{ paddingVertical: 14 }}
                textClassName="text-body-md font-semibold"
            />
        </View>
    );
}
