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

export type PostComment = {
    id: string;
    content: string;
    createdAt: string;
    author: PostAuthor;
};

/** A post with its comments loaded, as returned by the post-details endpoint. */
export type PostDetails = Post & {
    comments: PostComment[];
};