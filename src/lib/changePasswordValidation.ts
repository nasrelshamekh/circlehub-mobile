export type ChangePasswordValues = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export type ChangePasswordErrors = {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
};

export function validateChangePassword(
    values: ChangePasswordValues
): ChangePasswordErrors {
    const errors: ChangePasswordErrors = {};

    if (!values.currentPassword) {
        errors.currentPassword = "Enter your current password";
    }

    if (!values.newPassword) {
        errors.newPassword = "Password is required";
    } else if (values.newPassword.length < 8) {
        errors.newPassword = "Password must be at least 8 characters";
    }

    if (!values.confirmPassword) {
        errors.confirmPassword = "Confirm your new password";
    } else if (values.confirmPassword !== values.newPassword) {
        errors.confirmPassword = "Passwords don't match";
    }

    return errors;
}
