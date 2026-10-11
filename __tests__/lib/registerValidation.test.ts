import {
    RegisterValues,
    validateRegister,
} from "@/lib/registerValidation";

function makeValues(overrides: Partial<RegisterValues> = {}): RegisterValues {
    return {
        name: "Ada Lovelace",
        username: "ada_lovelace",
        jobTitle: "Software Engineer",
        gender: "female",
        dateOfBirth: new Date(1990, 0, 1),
        location: "Lagos, Nigeria",
        email: "ada@example.com",
        password: "password123",
        ...overrides,
    };
}

describe("validateRegister", () => {
    it("returns no errors for valid values", () => {
        expect(validateRegister(makeValues())).toEqual({});
    });

    it("requires a full name of at least 2 characters", () => {
        expect(validateRegister(makeValues({ name: "" })).name).toBe(
            "Full name is required"
        );
        expect(validateRegister(makeValues({ name: "A" })).name).toBe(
            "Full name must be at least 2 characters"
        );
    });

    it("validates the username format and length", () => {
        expect(validateRegister(makeValues({ username: "" })).username).toBe(
            "Username is required"
        );
        expect(validateRegister(makeValues({ username: "ab" })).username).toBe(
            "Username must be between 3 and 30 characters"
        );
        expect(
            validateRegister(makeValues({ username: "bad name" })).username
        ).toBe("Username can only contain letters, numbers, and underscores");
    });

    it("requires a job title", () => {
        expect(validateRegister(makeValues({ jobTitle: "" })).jobTitle).toBe(
            "Job title is required"
        );
    });

    it("requires a known gender", () => {
        expect(validateRegister(makeValues({ gender: "" })).gender).toBe(
            "Please select a gender"
        );
        expect(
            validateRegister(makeValues({ gender: "unknown" })).gender
        ).toBe("Gender is invalid");
    });

    it("requires a birthdate that is not in the future", () => {
        expect(
            validateRegister(makeValues({ dateOfBirth: null })).dateOfBirth
        ).toBe("Birthdate is required");

        const future = new Date();
        future.setDate(future.getDate() + 1);

        expect(
            validateRegister(makeValues({ dateOfBirth: future })).dateOfBirth
        ).toBe("Birthdate can't be in the future");
    });

    it("requires a City, Country location", () => {
        expect(validateRegister(makeValues({ location: "" })).location).toBe(
            "Location is required"
        );
        expect(
            validateRegister(makeValues({ location: "Lagos" })).location
        ).toBe("Location must be in the format City, Country");
    });

    it("validates the email address", () => {
        expect(validateRegister(makeValues({ email: "" })).email).toBe(
            "Email is required"
        );
        expect(validateRegister(makeValues({ email: "nope" })).email).toBe(
            "Email is invalid"
        );
    });

    it("requires a password of at least 8 characters", () => {
        expect(validateRegister(makeValues({ password: "" })).password).toBe(
            "Password is required"
        );
        expect(validateRegister(makeValues({ password: "short" })).password).toBe(
            "Password must be at least 8 characters"
        );
    });

    it("collects every error at once", () => {
        const errors = validateRegister(
            makeValues({
                name: "",
                username: "",
                jobTitle: "",
                gender: "",
                dateOfBirth: null,
                location: "",
                email: "",
                password: "",
            })
        );

        expect(Object.keys(errors)).toHaveLength(8);
    });
});
