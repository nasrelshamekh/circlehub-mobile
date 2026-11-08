import {
    InfiniteData,
    QueryKey,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { addPostComment } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { PageMeta } from "@/types/api";
import { Post, PostComment, PostDetails } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };
type FeedData = InfiniteData<FeedPage>;

function bumpCommentsCount(posts: Post[], postId: string, delta: number): Post[] {
    return posts.map((post) =>
        post.id === postId
            ? {
                  ...post,
                  commentsCount: Math.max(
                      0,
                      (post.commentsCount ?? 0) + delta
                  ),
              }
            : post
    );
}

function insertReplyIntoTree(
    comments: PostComment[],
    parentCommentId: string,
    reply: PostComment
): PostComment[] {
    return comments.map((comment) => {
        if (comment.id === parentCommentId) {
            return {
                ...comment,
                replies: [...(comment.replies ?? []), reply],
            };
        }
        if (comment.replies && comment.replies.length > 0) {
            return {
                ...comment,
                replies: insertReplyIntoTree(comment.replies, parentCommentId, reply),
            };
        }
        return comment;
    });
}

export default function useAddComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            postId,
            content,
            parentCommentId,
        }: {
            postId: string;
            content: string;
            parentCommentId?: string | null;
        }) => addPostComment(postId, content, parentCommentId),

        onSuccess: (response, { postId, parentCommentId }) => {
            const newComment: PostComment = response.data.comment;

            queryClient.setQueryData<PostDetails>(
                queryKeys.post(postId),
                (old) => {
                    if (!old) return old;

                    let comments: PostComment[];
                    if (parentCommentId) {
                        comments = insertReplyIntoTree(
                            old.comments ?? [],
                            parentCommentId,
                            newComment
                        );
                    } else {
                        comments = [newComment, ...(old.comments ?? [])];
                    }

                    return {
                        ...old,
                        comments,
                        commentsCount: (old.commentsCount ?? 0) + 1,
                    };
                }
            );

            queryClient.setQueryData<FeedData>(queryKeys.feed(), (old) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: bumpCommentsCount(page.data, postId, 1),
                    })),
                };
            });

            const arrayPredicate = (query: { queryKey: QueryKey }) => {
                const [root, , sub] = query.queryKey;
                return (
                    (root === "user" &&
                        (sub === "posts" || sub === "liked-posts")) ||
                    (root === "community" && sub === "posts")
                );
            };

            queryClient.setQueriesData<Post[]>(
                { predicate: arrayPredicate },
                (old) => (Array.isArray(old) ? bumpCommentsCount(old, postId, 1) : old)
            );

            queryClient.setQueriesData<{ posts?: Post[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.posts
                        ? { ...old, posts: bumpCommentsCount(old.posts, postId, 1) }
                        : old
            );
        },
    });
}
