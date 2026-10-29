export type PostAuthor = {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;

    jobTitle?: string | null;
};

export type PostCommunity = {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    visibility: string;
};

export type PollOption = {
    id: string;
    text: string;
    displayOrder: number;
    votesCount: number;
    percentage: number;
};

export type Poll = {
    id: string;
    question: string;
    expiresAt: string | null;
    isExpired: boolean;
    totalVotes: number;
    myVotedOptionId: string | null;
    options: PollOption[];
};

export type Post = {
    id: string;
    content: string;
    imageUrl: string | null;
    imageUrls?: string[];
    poll?: Poll | null;
    createdAt: string;
    updatedAt: string;
    likesCount: number;
    commentsCount: number;
    isLikedByMe: boolean;
    author: PostAuthor;

    community?: PostCommunity | null;
};

export type PostComment = {
    id: string;
    content: string;
    createdAt: string;
    author: PostAuthor;
};

export type PostDetails = Post & {
    comments: PostComment[];
};
