import { API_URL } from "@/config/env";

export function getImageUrl(url: string | null) {
    if (!url) return null;

    if (url.startsWith("/")) {
        return `${API_URL}${url}`;
    }

    return url;
}