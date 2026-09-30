const API_URL = "http://192.168.88.67:5289";

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