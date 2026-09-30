export type PostAuthor = {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
};

export type Post = {
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
    likesCount: number;
    commentsCount: number;
    isLikedByMe: boolean;
    author: PostAuthor;
};