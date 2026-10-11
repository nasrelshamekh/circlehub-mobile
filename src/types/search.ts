import { CommunityListItem } from "@/types/community";
import { Post } from "@/types/post";

export type SearchUser = {
    id: string;
    name: string;
    username: string;
    jobTitle: string | null;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    skills: string[];
    gender: string | null;
    dateOfBirth: string | null;
    createdAt: string;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    isFollowedByMe: boolean;
};

export type SearchResults = {
    users: SearchUser[];
    communities: CommunityListItem[];
    posts: Post[];
};
