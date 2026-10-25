export type User = {
    id: string;
    name: string;
    username: string;
    email: string;
    jobTitle: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    location: string | null;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    bio: string | null;
    website: string | null;
    skills: string[];
    emailVerified: boolean;
    profileVisibility: string;
    messagesFrom: string;
    emailNotifications: boolean;
    communityUpdates: boolean;
    createdAt: string;
    updatedAt: string;
};

export type UserProfile = User & {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    isCurrentUser: boolean;
    isFollowedByMe: boolean;
    followsMe: boolean;
    isProfileLocked: boolean;
    canMessage?: boolean;
};

export type FollowUser = {
    id: string;
    name: string;
    username: string;
    jobTitle: string | null;
    bio: string | null;
    location: string | null;
    avatarUrl: string | null;
    followersCount: number;
    isFollowedByMe: boolean;
    isCurrentUser: boolean;
};
