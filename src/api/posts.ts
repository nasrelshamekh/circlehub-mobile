import { apiFetch } from "./client";

export function getPosts() {
    return apiFetch("/api/Posts");
}