import { validateChangePassword } from "@/lib/changePasswordValidation";

const validValues = {
    currentPassword: "oldpassword",
    newPassword: "password123",
    confirmPassword: "password123",
};

describe("validateChangePassword", () => {
    it("returns no errors when every field is valid", () => {
        expect(validateChangePassword(validValues)).toEqual({});
    });

    it("requires the current password", () => {
        expect(
            validateChangePassword({ ...validValues, currentPassword: "" })
                .currentPassword
        ).toBe("Enter your current password");
    });

    it("requires a new password of at least 8 characters", () => {
        expect(
            validateChangePassword({ ...validValues, newPassword: "" })
                .newPassword
        ).toBe("Password is required");

        expect(
            validateChangePassword({
                ...validValues,
                newPassword: "short",
                confirmPassword: "short",
            }).newPassword
        ).toBe("Password must be at least 8 characters");
    });

    it("requires the confirmation field", () => {
        expect(
            validateChangePassword({ ...validValues, confirmPassword: "" })
                .confirmPassword
        ).toBe("Confirm your new password");
    });

    it("rejects mismatched new passwords", () => {
        expect(
            validateChangePassword({
                ...validValues,
                confirmPassword: "password124",
            }).confirmPassword
        ).toBe("Passwords don't match");
    });
});
