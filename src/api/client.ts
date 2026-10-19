import { API_URL } from "@/config/env";
import { expireTokenIfCurrent, getToken } from "@/lib/session";
import { ApiError, ApiErrorBody } from "../types/api";

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
    try {
        const body = await response.json();
        return body && typeof body === "object" ? (body as ApiErrorBody) : null;
    } catch {
        return null;
    }
}

function messageFromBody(body: ApiErrorBody | null, status: number): string {
    if (body?.message) {
        return body.message;
    }

    if (body?.errors) {
        const first = Object.values(body.errors)
            .flat()
            .find((entry) => typeof entry === "string" && entry.length > 0);

        if (first) {
            return first;
        }
    }

    return `Request failed with status ${status}`;
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = await getToken();

    const headers = new Headers(options?.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;

    try {
        response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } catch {
        throw new ApiError(
            0,
            `Cannot reach the server at ${API_URL}. Check that the backend is running and EXPO_PUBLIC_API_URL points at this machine.`,
            null
        );
    }

    if (!response.ok) {
        if (
            response.status === 401 &&
            token &&
            !endpoint.toLowerCase().includes("/auth/login")
        ) {
            await expireTokenIfCurrent(token);
        }

        const body = await readErrorBody(response);
        throw new ApiError(response.status, messageFromBody(body, response.status), body);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}
