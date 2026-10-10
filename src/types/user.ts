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
    createdAt: string;
    updatedAt: string;
};

/** The user-profile payload from `/api/Users/{username}`, extending the base
 *  user with the counters and relation flags the profile page renders. */
export type UserProfile = User & {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    isCurrentUser: boolean;
    isFollowedByMe: boolean;
    followsMe: boolean;
};