// GIF Service for Mobile - Integrates with GIPHY API with curated fallbacks and utilities

const GIPHY_API_KEY =
    process.env.EXPO_PUBLIC_GIPHY_API_KEY || "sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh";
const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";

export interface GifItem {
    id: string;
    title: string;
    url: string;
    previewUrl: string;
    width: number;
    height: number;
}

export interface GifCategory {
    id: string;
    label: string;
    query: string;
}

export const GIF_CATEGORIES: GifCategory[] = [
    { id: "trending", label: "🔥 Trending", query: "" },
    { id: "laugh", label: "😂 Laugh", query: "laugh lol" },
    { id: "agree", label: "👍 Agree", query: "yes thumbs up" },
    { id: "party", label: "🎉 Party", query: "party celebrate" },
    { id: "love", label: "❤️ Love", query: "love heart" },
    { id: "shocked", label: "😮 Shocked", query: "wow shocked" },
    { id: "dance", label: "💃 Dance", query: "dance vibe" },
    { id: "sad", label: "😢 Sad", query: "sad cry" },
];

export const CURATED_FALLBACK_GIFS: GifItem[] = [
    {
        id: "curated-1",
        title: "Excited Cat",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3dTRqM2ZkMm84NHJkOTlnbzdwb2FjMHJkZ3N4ZnN2bmN2YXRieCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BzyTuYCmvSORqs1ABM/giphy.gif",
        previewUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3dTRqM2ZkMm84NHJkOTlnbzdwb2FjMHJkZ3N4ZnN2bmN2YXRieCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BzyTuYCmvSORqs1ABM/200.gif",
        width: 200,
        height: 200,
    },
    {
        id: "curated-2",
        title: "Thumbs Up",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3dTRqM2ZkMm84NHJkOTlnbzdwb2FjMHJkZ3N4ZnN2bmN2YXRieCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/111ebonMs90YLu/giphy.gif",
        previewUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3dTRqM2ZkMm84NHJkOTlnbzdwb2FjMHJkZ3N4ZnN2bmN2YXRieCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/111ebonMs90YLu/200.gif",
        width: 200,
        height: 150,
    },
    {
        id: "curated-3",
        title: "Mind Blown",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3dTRqM2ZkMm84NHJkOTlnbzdwb2FjMHJkZ3N4ZnN2bmN2YXRieCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT0xeJpnrWC4XWblEk/giphy.gif",
        previewUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3dTRqM2ZkMm84NHJkOTlnbzdwb2FjMHJkZ3N4ZnN2bmN2YXRieCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT0xeJpnrWC4XWblEk/200.gif",
        width: 200,
        height: 200,
    },
    {
        id: "curated-4",
        title: "Celebration Confetti",
        url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3dTRqM2ZkMm84NHJkOTlnbzdwb2FjMHJkZ3N4ZnN2bmN2YXRieCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/artj92V8o75VPL7AeQ/giphy.gif",
        previewUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3dTRqM2ZkMm84NHJkOTlnbzdwb2FjMHJkZ3N4ZnN2bmN2YXRieCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/artj92V8o75VPL7AeQ/200.gif",
        width: 200,
        height: 200,
    },
];

interface GiphyResponseItem {
    id: string;
    title?: string;
    images?: {
        fixed_height?: { url?: string; width?: string; height?: string };
        original?: { url?: string };
        downsized_medium?: { url?: string };
        downsized?: { url?: string };
    };
}

function formatGiphyItem(item: GiphyResponseItem): GifItem {
    const fixedHeight = item.images?.fixed_height;
    const original = item.images?.original;
    const downsized = item.images?.downsized_medium || item.images?.downsized;

    return {
        id: item.id,
        title: item.title || "GIF",
        url: downsized?.url || original?.url || fixedHeight?.url || "",
        previewUrl: fixedHeight?.url || downsized?.url || original?.url || "",
        width: parseInt(fixedHeight?.width || "200", 10),
        height: parseInt(fixedHeight?.height || "200", 10),
    };
}

export async function fetchTrendingGifs(limit = 24): Promise<GifItem[]> {
    try {
        const response = await fetch(
            `${GIPHY_BASE_URL}/trending?api_key=${encodeURIComponent(
                GIPHY_API_KEY
            )}&limit=${limit}&rating=g`
        );
        if (!response.ok) {
            throw new Error(`GIPHY API HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data?.data && Array.isArray(data.data)) {
            return (data.data as GiphyResponseItem[]).map(formatGiphyItem);
        }
        return CURATED_FALLBACK_GIFS;
    } catch {
        return CURATED_FALLBACK_GIFS;
    }
}

export async function searchGifs(query: string, limit = 24): Promise<GifItem[]> {
    const trimmed = query?.trim();
    if (!trimmed) {
        return fetchTrendingGifs(limit);
    }

    try {
        const response = await fetch(
            `${GIPHY_BASE_URL}/search?api_key=${encodeURIComponent(
                GIPHY_API_KEY
            )}&q=${encodeURIComponent(trimmed)}&limit=${limit}&rating=g`
        );
        if (!response.ok) {
            throw new Error(`GIPHY API HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data?.data && Array.isArray(data.data)) {
            return (data.data as GiphyResponseItem[]).map(formatGiphyItem);
        }
        return CURATED_FALLBACK_GIFS.filter((g) =>
            g.title.toLowerCase().includes(trimmed.toLowerCase())
        );
    } catch {
        return CURATED_FALLBACK_GIFS.filter((g) =>
            g.title.toLowerCase().includes(trimmed.toLowerCase())
        );
    }
}

const GIF_URL_PATTERN =
    /(https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:giphy\.com|tenor\.com)\/[^\s]+|https?:\/\/[^\s]+(?:\.gif|\/200\.gif|\/giphy\.gif)(?:\?[^\s]*)?)/i;

export function isGifUrl(url?: string | null): boolean {
    if (!url || typeof url !== "string") return false;
    return GIF_URL_PATTERN.test(url.trim());
}

export function parseGifContent(content?: string | null): { text: string; gifUrl: string | null } {
    if (!content || typeof content !== "string") {
        return { text: "", gifUrl: null };
    }
    const match = content.match(GIF_URL_PATTERN);
    if (!match) {
        return { text: content, gifUrl: null };
    }
    const gifUrl = match[0];
    const text = content.replace(gifUrl, "").trim();
    return { text, gifUrl };
}
