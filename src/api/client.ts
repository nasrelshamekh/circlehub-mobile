import { API_URL } from "@/config/env";

export async function apiFetch(
    endpoint: string,
    options?: RequestInit
) {
    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}