import { apiFetch } from "./client";
import { UploadImage } from "@/lib/imageUpload";
import { Post } from "@/types/post";

export function getPosts() {
    return apiFetch<{ data: Post[] }>("/api/Posts");
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
