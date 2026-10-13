import { apiFetch } from "./client";
import { appendImageToFormData, UploadImage } from "@/lib/imageUpload";
import { UserCommunity } from "@/types/community";
import { Post } from "@/types/post";
import { FollowUser, User, UserProfile } from "@/types/user";

export function getUserProfile(username: string) {
    return apiFetch<{ message: string; data: UserProfile }>(
        `/api/Users/${username}`
    );
}

export function getUserPosts(username: string) {
    return apiFetch<{ message: string; data: Post[] }>(
        `/api/Users/${username}/posts`
    );
}

export function getUserLikedPosts(username: string) {
    return apiFetch<{ message: string; data: Post[] }>(
        `/api/Users/${username}/liked-posts`
    );
}

export function getUserFollowers(username: string) {
    return apiFetch<{ message: string; data: FollowUser[] }>(
        `/api/Users/${username}/followers`
    );
}

export function getUserFollowing(username: string) {
    return apiFetch<{ message: string; data: FollowUser[] }>(
        `/api/Users/${username}/following`
    );
}

export function followUser(userId: string) {
    return apiFetch<{ message: string }>(`/api/Users/${userId}/follow`, {
        method: "POST",
    });
}

export function unfollowUser(userId: string) {
    return apiFetch<{ message: string }>(`/api/Users/${userId}/follow`, {
        method: "DELETE",
    });
}

export function getUserCommunities(username: string) {
    return apiFetch<{ message: string; data: UserCommunity[] }>(
        `/api/Users/${username}/communities`
    );
}

export type UpdateProfileInput = {
    name: string;
    jobTitle: string;
    bio: string;
    location: string;
    website: string;
    /** "male" | "female" | "other"; omit to leave the stored value untouched. */
    gender?: string;
    /** ISO date (YYYY-MM-DD); omit to leave the stored value untouched. */
    dateOfBirth?: string;
    skills: string[];
    avatarImage?: UploadImage | null;
    coverImage?: UploadImage | null;
};

export function updateProfile(input: UpdateProfileInput) {
    const formData = new FormData();

    formData.append("name", input.name);
    formData.append("jobTitle", input.jobTitle);
    formData.append("bio", input.bio);
    formData.append("location", input.location);
    formData.append("website", input.website);

    if (input.gender) {
        formData.append("gender", input.gender);
    }

    if (input.dateOfBirth) {
        formData.append("dateOfBirth", input.dateOfBirth);
    }

    input.skills.forEach((skill) => formData.append("skills", skill));

    appendImageToFormData(formData, "avatarImage", input.avatarImage);
    appendImageToFormData(formData, "coverImage", input.coverImage);

    return apiFetch<{ message: string; data: User }>("/api/Users/me", {
        method: "PATCH",
        body: formData,
    });
}

export type UpdateSettingsInput = {
    profileVisibility: string;
    messagesFrom: string;
    emailNotifications: boolean;
    communityUpdates: boolean;
};

export function updateSettings(input: UpdateSettingsInput) {
    return apiFetch<{ message: string; data: User }>(
        "/api/Users/me/settings",
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }
    );
}
