import { apiFetch } from "./client";
import { UploadImage } from "@/lib/imageUpload";
import { PageMeta } from "@/types/api";
import { Post, PostComment, PostDetails } from "@/types/post";

export function getPosts(page = 1, pageSize = 10) {
    return apiFetch<{ data: Post[]; meta: PageMeta }>(
        `/api/Posts?page=${page}&pageSize=${pageSize}`
    );
}

export type ToggleLikeResult = {
    postId: string;
    likesCount: number;
    isLikedByMe: boolean;
};

/**
 * Toggles the current user's like on a post. The API responds with the
 * authoritative count + state for that post, which callers can reconcile
 * against after an optimistic update.
 */
export function toggleLike(postId: string) {
    return apiFetch<{ message: string; data: ToggleLikeResult }>(
        `/api/Posts/${postId}/like`,
        { method: "PATCH" }
    );
}

/**
 * Creates a post. The API binds `[FromForm] CreatePostDto` (content + optional
 * image), so we send multipart/form-data. We must NOT set the Content-Type
 * header ourselves — the runtime adds the multipart boundary.
 */
export function createPost(content: string, image?: UploadImage | null) {
    const formData = new FormData();

    formData.append("content", content);

    if (image) {
        if (image.file) {
            formData.append("image", image.file);
        } else {
            // React Native's fetch accepts a { uri, name, type } file object.
            formData.append("image", {
                uri: image.uri,
                name: image.name,
                type: image.type,
            } as unknown as Blob);
        }
    }

    return apiFetch<{ message: string; data: Post }>("/api/Posts", {
        method: "POST",
        body: formData,
    });
}

/**
 * Loads a single post with its comments. Callers get the post via the shared
 * `["post", id]` query key so comments reconcile with likes and the feed.
 */
export function getPostById(postId: string) {
    return apiFetch<{ message: string; data: PostDetails }>(
        `/api/Posts/${postId}`
    );
}

/**
 * Adds a comment to a post and returns the created comment so callers can
 * prepend it to the post-details cache.
 */
export function addPostComment(postId: string, content: string) {
    return apiFetch<{ message: string; data: { comment: PostComment } }>(
        `/api/Posts/${postId}/comments`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        }
    );
}