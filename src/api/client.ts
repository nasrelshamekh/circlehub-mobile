import { API_URL } from "@/config/env";
import { ApiError, ApiErrorBody } from "../types/api";

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
    try {
        const body = await response.json();
        return typeof body?.message === "string" ? body : null;
    } catch {
        return null;
    }
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`${API_URL}${endpoint}`, options);
    } catch {
        throw new ApiError(
            0,
            `Cannot reach the server at ${API_URL}. Check that the backend is running and EXPO_PUBLIC_API_URL points at this machine.`,
            null
        );
    }

    if (!response.ok) {
        const body = await readErrorBody(response);
        throw new ApiError(
            response.status,
            body?.message ?? `Request failed with status ${response.status}`,
            body
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}