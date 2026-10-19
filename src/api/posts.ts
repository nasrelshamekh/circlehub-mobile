import { apiFetch } from "./client";
import { appendImageToFormData, UploadImage } from "@/lib/imageUpload";
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

export function toggleLike(postId: string) {
    return apiFetch<{ message: string; data: ToggleLikeResult }>(
        `/api/Posts/${postId}/like`,
        { method: "PATCH" }
    );
}

export function createPost(
    content: string,
    image?: UploadImage | null,
    communityId?: string
) {
    const formData = new FormData();

    formData.append("content", content);
    appendImageToFormData(formData, "image", image);

    const endpoint = communityId
        ? `/api/Communities/${communityId}/posts`
        : "/api/Posts";

    return apiFetch<{ message: string; data: Post }>(endpoint, {
        method: "POST",
        body: formData,
    });
}

export function updatePost(
    postId: string,
    content: string,
    image?: UploadImage | null
) {
    const formData = new FormData();

    formData.append("content", content);
    appendImageToFormData(formData, "image", image);

    return apiFetch<{ message: string; data: Post }>(`/api/Posts/${postId}`, {
        method: "PATCH",
        body: formData,
    });
}

export function deletePost(postId: string) {
    return apiFetch<{ message: string }>(`/api/Posts/${postId}`, {
        method: "DELETE",
    });
}

export function deleteCommunityPost(communityId: string, postId: string) {
    return apiFetch<{ message: string }>(
        `/api/Communities/${communityId}/posts/${postId}`,
        { method: "DELETE" }
    );
}

export function getCommunityPosts(communityId: string) {
    return apiFetch<{ message: string; count: number; data: Post[] }>(
        `/api/Communities/${communityId}/posts`
    );
}

export function getPostById(postId: string) {
    return apiFetch<{ message: string; data: PostDetails }>(`/api/Posts/${postId}`);
}

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

export function deletePostComment(postId: string, commentId: string) {
    return apiFetch<{ message: string }>(
        `/api/Posts/${postId}/comments/${commentId}`,
        { method: "DELETE" }
    );
}
