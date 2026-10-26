import { Platform } from "react-native";

import { API_URL } from "@/config/env";

export function getImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    let normalized = url.trim().replace(/\\/g, "/");
    if (!normalized) return null;

    // Relative uploads path without leading slash
    if (normalized.startsWith("uploads/")) {
        normalized = `/${normalized}`;
    }

    // Relative path with leading slash
    if (normalized.startsWith("/")) {
        normalized = `${API_URL}${normalized}`;
    }

    // Normalize localhost URLs that may have been saved during dev/testing
    if (normalized.includes("localhost:") || normalized.includes("127.0.0.1:")) {
        const path = normalized.replace(/^https?:\/\/[^/]+/, "");
        normalized = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
    }

    // On Android, legacy static uploads hosted directly on circlehub.runasp.net/uploads
    // encounter IIS TLS renegotiation which BoringSSL terminates. Cleartext HTTP for this
    // specific host and path avoids renegotiation and loads smoothly.
    if (
        Platform.OS === "android" &&
        normalized.startsWith("https://circlehub.runasp.net/uploads/")
    ) {
        normalized = normalized.replace(
            "https://circlehub.runasp.net/uploads/",
            "http://circlehub.runasp.net/uploads/"
        );
    }

    return normalized;
}
