import {
    InfiniteData,
    QueryKey,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { deletePostComment } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { PageMeta } from "@/types/api";
import { Post, PostDetails } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };
type FeedData = InfiniteData<FeedPage>;

type DeleteCommentInput = { postId: string; commentId: string };

function bumpCommentsCount(posts: Post[], postId: string, delta: number) {
    return posts.map((post) =>
        post.id === postId
            ? {
                  ...post,
                  commentsCount: Math.max(0, (post.commentsCount ?? 0) + delta),
              }
            : post
    );
}

export default function useDeleteComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, commentId }: DeleteCommentInput) =>
            deletePostComment(postId, commentId),

        onMutate: async ({ postId, commentId }) => {
            await queryClient.cancelQueries();

            const snapshots: [QueryKey, unknown][] = queryClient.getQueriesData({
                predicate: () => true,
            });

            queryClient.setQueryData<PostDetails>(
                queryKeys.post(postId),
                (old) => {
                    if (!old) return old;

                    const comments = (old.comments ?? []).filter(
                        (comment) => comment.id !== commentId
                    );

                    return { ...old, comments, commentsCount: comments.length };
                }
            );

            queryClient.setQueryData<FeedData>(queryKeys.feed(), (old) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: bumpCommentsCount(page.data, postId, -1),
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
                (old) =>
                    Array.isArray(old)
                        ? bumpCommentsCount(old, postId, -1)
                        : old
            );

            // Search results carry their posts on a `posts` field.
            queryClient.setQueriesData<{ posts?: Post[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.posts
                        ? {
                              ...old,
                              posts: bumpCommentsCount(old.posts, postId, -1),
                          }
                        : old
            );

            return { snapshots };
        },

        onError: (_error, _input, context) => {
            context?.snapshots.forEach(([key, value]) => {
                queryClient.setQueryData(key, value);
            });
        },
    });
}
