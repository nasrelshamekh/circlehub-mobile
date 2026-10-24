import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

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
    } catch (error) {
        console.warn(`[apiFetch] Request failed for ${endpoint}:`, error);
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

export type ApiUploadOptions = {
    method?: "POST" | "PATCH" | "PUT";
    fieldName?: string;
    mimeType?: string;
    parameters?: Record<string, string>;
};

export async function apiUpload<T>(
    endpoint: string,
    fileUri: string,
    options?: ApiUploadOptions
): Promise<T> {
    const token = await getToken();
    const url = `${API_URL}${endpoint}`;
    const httpMethod = options?.method ?? "POST";
    const fieldName = options?.fieldName ?? "image";

    if (Platform.OS === "web") {
        const formData = new FormData();
        if (options?.parameters) {
            for (const [key, value] of Object.entries(options.parameters)) {
                formData.append(key, value);
            }
        }
        return apiFetch<T>(endpoint, { method: httpMethod, body: formData });
    }

    let result: FileSystem.FileSystemUploadResult;
    try {
        result = await FileSystem.uploadAsync(url, fileUri, {
            httpMethod,
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName,
            mimeType: options?.mimeType ?? "image/jpeg",
            parameters: options?.parameters,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                Accept: "application/json",
            },
        });
    } catch (error) {
        console.warn(`[apiUpload] Native upload failed for ${endpoint}:`, error);
        throw new ApiError(
            0,
            `Cannot reach the server at ${API_URL}. Check that the backend is running and EXPO_PUBLIC_API_URL points at this machine.`,
            null
        );
    }

    let body: ApiErrorBody | null = null;
    try {
        body = result.body ? (JSON.parse(result.body) as ApiErrorBody) : null;
    } catch {
        body = null;
    }

    if (result.status < 200 || result.status >= 300) {
        if (
            result.status === 401 &&
            token &&
            !endpoint.toLowerCase().includes("/auth/login")
        ) {
            await expireTokenIfCurrent(token);
        }

        throw new ApiError(
            result.status,
            messageFromBody(body, result.status),
            body
        );
    }

    if (result.status === 204) {
        return undefined as T;
    }

    return body as unknown as T;
}
