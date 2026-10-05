import { apiFetch } from "./client";
import { AuthResponse } from "@/types/auth";

type LoginData = {
    usernameOrEmail: string;
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