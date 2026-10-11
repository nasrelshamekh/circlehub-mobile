import { apiFetch } from "./client";
import { SearchResults } from "@/types/search";

export function search(query: string) {
    return apiFetch<{ message: string; data: SearchResults }>(
        `/api/Search?q=${encodeURIComponent(query)}`
    );
}
