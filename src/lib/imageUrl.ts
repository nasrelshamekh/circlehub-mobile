const API_URL = "http://192.168.88.67:5289";

export function getImageUrl(url: string | null) {
    if (!url) return null;

    if (url.startsWith("/")) {
        return `${API_URL}${url}`;
    }

    return url;
}