import { apiFetch } from "./client";
import { Post } from "@/types/post";

export function getPosts() {
    return apiFetch<{ data: Post[] }>("/api/Posts");
}