import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toggleCommentLike } from "@/api/posts";
import { haptics } from "@/lib/haptics";
import { queryKeys } from "@/lib/queryKeys";
import { PostComment, PostDetails } from "@/types/post";

function updateCommentLikeInTree(
    comments: PostComment[],
    commentId: string,
    isLiked: boolean,
    likesCount: number
): PostComment[] {
    return comments.map((comment) => {
        if (comment.id === commentId) {
            return {
                ...comment,
                isLiked,
                likesCount,
            };
        }
        if (comment.replies && comment.replies.length > 0) {
            return {
                ...comment,
                replies: updateCommentLikeInTree(
                    comment.replies,
                    commentId,
                    isLiked,
                    likesCount
                ),
            };
        }
        return comment;
    });
}

export default function useToggleCommentLike() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            postId,
            commentId,
        }: {
            postId: string;
            commentId: string;
        }) => toggleCommentLike(postId, commentId),

        onMutate: async ({ postId, commentId }) => {
            haptics.light();
            await queryClient.cancelQueries({ queryKey: queryKeys.post(postId) });
            const previousPost = queryClient.getQueryData<PostDetails>(
                queryKeys.post(postId)
            );

            if (previousPost?.comments) {
                const findComment = (list: PostComment[]): PostComment | null => {
                    for (const c of list) {
                        if (c.id === commentId) return c;
                        if (c.replies?.length) {
                            const found = findComment(c.replies);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const target = findComment(previousPost.comments);
                if (target) {
                    const optimisticIsLiked = !target.isLiked;
                    const optimisticCount = Math.max(
                        0,
                        (target.likesCount ?? 0) + (optimisticIsLiked ? 1 : -1)
                    );

                    queryClient.setQueryData<PostDetails>(
                        queryKeys.post(postId),
                        (old) => {
                            if (!old) return old;
                            return {
                                ...old,
                                comments: updateCommentLikeInTree(
                                    old.comments ?? [],
                                    commentId,
                                    optimisticIsLiked,
                                    optimisticCount
                                ),
                            };
                        }
                    );
                }
            }

            return { previousPost };
        },

        onSuccess: (response, { postId, commentId }) => {
            const data = response.data;
            if (data) {
                queryClient.setQueryData<PostDetails>(
                    queryKeys.post(postId),
                    (old) => {
                        if (!old) return old;
                        return {
                            ...old,
                            comments: updateCommentLikeInTree(
                                old.comments ?? [],
                                commentId,
                                data.isLiked,
                                data.likesCount
                            ),
                        };
                    }
                );
            }
        },

        onError: (_err, { postId }, context) => {
            haptics.error();
            if (context?.previousPost) {
                queryClient.setQueryData<PostDetails>(
                    queryKeys.post(postId),
                    context.previousPost
                );
            }
        },
    });
}
