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

// Registration doesn't mint a token; the account needs email verification.
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
    return apiFetch<{ success?: boolean; message: string }>("/api/Auth/verify-email", {
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

export function forgotPassword(email: string) {
    return apiFetch<{ success?: boolean; message: string }>(
        "/api/Auth/forgot-password",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        }
    );
}

export function resetPassword(userId: string, token: string, password: string) {
    return apiFetch<{ success?: boolean; message: string }>(
        "/api/Auth/reset-password",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId, token, password }),
        }
    );
}

export function changePassword(currentPassword: string, newPassword: string) {
    return apiFetch<{ success?: boolean; message: string }>(
        "/api/Auth/change-password",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        }
    );
}

export function me() {
    return apiFetch<{ data: User }>("/api/Auth/me");
}
