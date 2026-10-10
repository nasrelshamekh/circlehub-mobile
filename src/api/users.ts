import { apiFetch } from "./client";
import { UserCommunity } from "@/types/community";
import { Post } from "@/types/post";
import { User, UserProfile } from "@/types/user";

/**
 * Profile resources for a username, mirroring circlehub-web's userApi so both
 * apps read the same backend contract.
 */

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

export function getUserFollowing(username: string) {
    return apiFetch<{ message: string; data: User[] }>(
        `/api/Users/${username}/following`
    );
}

export function getUserCommunities(username: string) {
    return apiFetch<{ message: string; data: UserCommunity[] }>(
        `/api/Users/${username}/communities`
    );
}