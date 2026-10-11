import {
    validateForgotPassword,
    validateResetPassword,
} from "@/lib/passwordResetValidation";

describe("validateForgotPassword", () => {
    it("returns no errors for a valid email", () => {
        expect(validateForgotPassword({ email: "ada@example.com" })).toEqual({});
    });

    it("ignores surrounding whitespace", () => {
        expect(validateForgotPassword({ email: " ada@example.com " })).toEqual({});
    });

    it("requires an email", () => {
        expect(validateForgotPassword({ email: "  " }).email).toBe(
            "Email is required"
        );
    });

    it("rejects a malformed email", () => {
        expect(validateForgotPassword({ email: "nope" }).email).toBe(
            "Email is invalid"
        );
    });
});

describe("validateResetPassword", () => {
    it("returns no errors when the passwords match", () => {
        expect(
            validateResetPassword({
                password: "password123",
                confirmPassword: "password123",
            })
        ).toEqual({});
    });

    it("requires a password of at least 8 characters", () => {
        expect(
            validateResetPassword({ password: "", confirmPassword: "" }).password
        ).toBe("Password is required");
        expect(
            validateResetPassword({
                password: "short",
                confirmPassword: "short",
            }).password
        ).toBe("Password must be at least 8 characters");
    });

    it("requires the confirmation field", () => {
        expect(
            validateResetPassword({
                password: "password123",
                confirmPassword: "",
            }).confirmPassword
        ).toBe("Confirm your password");
    });

    it("rejects mismatched passwords", () => {
        expect(
            validateResetPassword({
                password: "password123",
                confirmPassword: "password124",
            }).confirmPassword
        ).toBe("Passwords don't match");
    });
});
