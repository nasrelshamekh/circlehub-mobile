import { API_URL } from "@/config/env";

export function getImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    const trimmed = url.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("/")) {
        return `${API_URL}${trimmed}`;
    }

    return trimmed;
}
