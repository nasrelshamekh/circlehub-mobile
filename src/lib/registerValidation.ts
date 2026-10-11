export type RegisterFieldErrors = {
    name?: string;
    username?: string;
    jobTitle?: string;
    gender?: string;
    dateOfBirth?: string;
    location?: string;
    email?: string;
    password?: string;
};

export type RegisterValues = {
    name: string;
    username: string;
    jobTitle: string;
    gender: string;
    dateOfBirth: Date | null;
    location: string;
    email: string;
    password: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCATION_PATTERN = /^[^,]+,\s*[^,]+$/;

export function validateRegister(values: RegisterValues): RegisterFieldErrors {
    const errors: RegisterFieldErrors = {};

    const name = values.name.trim();
    if (!name) {
        errors.name = "Full name is required";
    } else if (name.length < 2) {
        errors.name = "Full name must be at least 2 characters";
    }

    const username = values.username.trim();
    if (!username) {
        errors.username = "Username is required";
    } else if (username.length < 3 || username.length > 30) {
        errors.username = "Username must be between 3 and 30 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.username =
            "Username can only contain letters, numbers, and underscores";
    }

    const jobTitle = values.jobTitle.trim();
    if (!jobTitle) {
        errors.jobTitle = "Job title is required";
    } else if (jobTitle.length < 2) {
        errors.jobTitle = "Job title must be at least 2 characters";
    }

    if (!values.gender) {
        errors.gender = "Please select a gender";
    } else if (
        values.gender !== "male" &&
        values.gender !== "female" &&
        values.gender !== "other"
    ) {
        errors.gender = "Gender is invalid";
    }

    if (!values.dateOfBirth) {
        errors.dateOfBirth = "Birthdate is required";
    } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (values.dateOfBirth > today) {
            errors.dateOfBirth = "Birthdate can't be in the future";
        }
    }

    const location = values.location.trim();
    if (!location) {
        errors.location = "Location is required";
    } else if (!LOCATION_PATTERN.test(location)) {
        errors.location = "Location must be in the format City, Country";
    }

    const email = values.email.trim();
    if (!email) {
        errors.email = "Email is required";
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = "Email is invalid";
    }

    if (!values.password) {
        errors.password = "Password is required";
    } else if (values.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
    }

    return errors;
}
