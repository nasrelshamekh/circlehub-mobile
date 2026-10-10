import { apiFetch } from "./client";
import { AuthResponse } from "@/types/auth";
import { User } from "@/types/user";

export type LoginData = {
    usernameOrEmail: string;
    password: string;
};

export type RegisterData = {
    name: string;
    username: string;
    jobTitle: string;
    gender: "male" | "female" | "other" | string;
    dateOfBirth: string;
    location: string;
    email: string;
    password: string;
};

export function login(data: LoginData) {
    return apiFetch<{ message: string; data: AuthResponse }>("/api/Auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
}

// Registering does NOT mint a token — the account stays unverified until the
// user opens the link we email them, so the response carries a User, not an
// AuthResponse.
export function register(data: RegisterData) {
    return apiFetch<{ message: string; data: User }>("/api/Auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
}

export function verifyEmail(userId: string, token: string) {
    return apiFetch<{ message: string }>("/api/Auth/verify-email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, token }),
    });
}

export function resendVerification(email: string) {
    return apiFetch<{ message: string }>("/api/Auth/resend-verification", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
    });
}

export function me() {
    return apiFetch<{ data: User }>("/api/Auth/me");
}
