import { Platform } from "react-native";

import { apiFetch, apiUpload } from "./client";
import { appendImageToFormData, UploadImage } from "@/lib/imageUpload";
import { PageMeta } from "@/types/api";
import { Poll, Post, PostComment, PostDetails } from "@/types/post";

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

export type CreatePollPayload = {
    question: string;
    options: string[];
    durationDays?: number;
};

export function votePoll(postId: string, optionId: string) {
    return apiFetch<{ message: string; data: Poll }>(
        `/api/Posts/${postId}/poll/vote`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optionId }),
        }
    );
}

export function createPost(
    content: string,
    image?: UploadImage | null,
    communityId?: string,
    poll?: CreatePollPayload | null,
    images?: UploadImage[] | null
) {
    const endpoint = communityId
        ? `/api/Communities/${communityId}/posts`
        : "/api/Posts";

    const allImages = images && images.length > 0 ? images : image ? [image] : [];

    if (allImages.length === 1 && Platform.OS !== "web" && !poll) {
        const singleImage = allImages[0];
        const parameters: Record<string, string> = { content };

        return apiUpload<{ message: string; data: Post }>(endpoint, singleImage.uri, {
            method: "POST",
            fieldName: "image",
            mimeType: singleImage.type,
            parameters,
        });
    }

    const formData = new FormData();

    formData.append("content", content);

    if (allImages.length === 1) {
        appendImageToFormData(formData, "image", allImages[0]);
    } else if (allImages.length > 1) {
        allImages.forEach((img) => {
            appendImageToFormData(formData, "images", img);
        });
    }

    if (poll) {
        formData.append("pollQuestion", poll.question);
        poll.options.forEach((opt) => {
            formData.append("pollOptions", opt);
        });
        if (poll.durationDays) {
            formData.append("pollDurationDays", String(poll.durationDays));
        }
    }

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
    const endpoint = `/api/Posts/${postId}`;

    if (image && Platform.OS !== "web") {
        return apiUpload<{ message: string; data: Post }>(endpoint, image.uri, {
            method: "PATCH",
            fieldName: "image",
            mimeType: image.type,
            parameters: { content },
        });
    }

    const formData = new FormData();

    formData.append("content", content);
    appendImageToFormData(formData, "image", image);

    return apiFetch<{ message: string; data: Post }>(endpoint, {
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
