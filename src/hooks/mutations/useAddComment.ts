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

/** Returns a copy of the posts with `postId`'s comment count bumped by delta. */
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

/**
 * Adds a comment and reconciles the caches it touches: the post details get the
 * new comment prepended (count follows the list), and the comment count bumps
 * in the feed, user/community post lists, and search results. Mirrors
 * circlehub-web's useAddComment.
 */
export default function useAddComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, content }: { postId: string; content: string }) =>
            addPostComment(postId, content),

        onSuccess: (response, { postId }) => {
            const newComment: PostComment = response.data.comment;

            // Post details: prepend the comment, count follows the list.
            queryClient.setQueryData<PostDetails>(
                queryKeys.post(postId),
                (old) => {
                    if (!old) return old;

                    const comments = [newComment, ...(old.comments ?? [])];

                    return {
                        ...old,
                        comments,
                        commentsCount: comments.length,
                    };
                }
            );

            // Feed (infinite pages).
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

            // Plain post arrays: a user's posts/liked posts, community feed.
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

            // Search results carry their posts on a `posts` field.
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