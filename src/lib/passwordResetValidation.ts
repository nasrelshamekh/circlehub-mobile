export type ForgotPasswordValues = {
    email: string;
};

export type ForgotPasswordErrors = {
    email?: string;
};

export type ResetPasswordValues = {
    password: string;
    confirmPassword: string;
};

export type ResetPasswordErrors = {
    password?: string;
    confirmPassword?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateForgotPassword(
    values: ForgotPasswordValues
): ForgotPasswordErrors {
    const errors: ForgotPasswordErrors = {};

    const email = values.email.trim();
    if (!email) {
        errors.email = "Email is required";
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = "Email is invalid";
    }

    return errors;
}

export function validateResetPassword(
    values: ResetPasswordValues
): ResetPasswordErrors {
    const errors: ResetPasswordErrors = {};

    if (!values.password) {
        errors.password = "Password is required";
    } else if (values.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
    }

    if (!values.confirmPassword) {
        errors.confirmPassword = "Confirm your password";
    } else if (values.confirmPassword !== values.password) {
        errors.confirmPassword = "Passwords don't match";
    }

    return errors;
}
