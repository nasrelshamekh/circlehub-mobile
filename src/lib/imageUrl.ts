import { API_URL } from "@/config/env";

export const DEFAULT_AVATAR_URL =
    "https://pub-b76e67ff61074ab197c54a2a3b53b763.r2.dev/defaults/avatar-placeholder.png";

export const DEFAULT_COVER_URL =
    "https://pub-b76e67ff61074ab197c54a2a3b53b763.r2.dev/defaults/cover-placeholder.png";

export function getImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    const trimmed = url.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("/")) {
        return `${API_URL}${trimmed}`;
    }

    return trimmed;
}
