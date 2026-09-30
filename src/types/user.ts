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