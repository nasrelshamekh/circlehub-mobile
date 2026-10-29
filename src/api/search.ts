import { apiFetch } from "./client";
import { SearchResults } from "@/types/search";

export type SearchParams = {
    q?: string;
    type?: string;
    sort?: string;
    mediaOnly?: boolean;
};

export function search(params: string | SearchParams) {
    const parsed: SearchParams = typeof params === "string" ? { q: params } : params;
    const queryParts: string[] = [];

    if (parsed.q?.trim()) {
        queryParts.push(`q=${encodeURIComponent(parsed.q.trim())}`);
    }
    if (parsed.type && parsed.type !== "all") {
        queryParts.push(`type=${encodeURIComponent(parsed.type)}`);
    }
    if (parsed.sort && parsed.sort !== "latest") {
        queryParts.push(`sort=${encodeURIComponent(parsed.sort)}`);
    }
    if (parsed.mediaOnly) {
        queryParts.push("mediaOnly=true");
    }

    const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return apiFetch<{ message: string; data: SearchResults }>(`/api/Search${qs}`);
}
