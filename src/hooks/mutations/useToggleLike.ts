import {
    InfiniteData,
    QueryKey,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { toggleLike } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { PageMeta } from "@/types/api";
import { Post } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };
type FeedData = InfiniteData<FeedPage>;

/** Returns a copy of the post with its like state/count flipped. */
function flipLike(post: Post): Post {
    const isLikedByMe = !post.isLikedByMe;

    return {
        ...post,
        isLikedByMe,
        likesCount: Math.max(0, post.likesCount + (isLikedByMe ? 1 : -1)),
    };
}

function flipInArray(posts: Post[], postId: string): Post[] {
    return posts.map((post) => (post.id === postId ? flipLike(post) : post));
}

/**
 * Optimistically toggles a post like: the heart and counter update instantly,
 * and the cache is rolled back if the request fails. Mirrors the web app's
 * useToggleLike so both clients behave the same.
 */
export default function useToggleLike() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: string) => toggleLike(postId),

        onMutate: async (postId) => {
            // Don't let an in-flight refetch overwrite our optimistic value.
            await queryClient.cancelQueries();

            // Snapshot only the queries we touch so a failed rollback can't
            // clobber unrelated cache entries that changed mid-request.
            const arrayPredicate = (query: { queryKey: QueryKey }) => {
                const [root, , sub] = query.queryKey;
                return (
                    (root === "user" &&
                        (sub === "posts" || sub === "liked-posts")) ||
                    (root === "community" && sub === "posts")
                );
            };

            const snapshots: [QueryKey, unknown][] = [
                ...queryClient.getQueriesData({ queryKey: queryKeys.feed() }),
                ...queryClient.getQueriesData({ queryKey: queryKeys.post(postId) }),
                ...queryClient.getQueriesData({ queryKey: ["search"] }),
                ...queryClient.getQueriesData({ predicate: arrayPredicate }),
            ];

            // Feed (infinite pages).
            queryClient.setQueryData<FeedData>(queryKeys.feed(), (old) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: flipInArray(page.data, postId),
                    })),
                };
            });

            // Single post detail.
            queryClient.setQueryData<Post>(queryKeys.post(postId), (old) =>
                old ? flipLike(old) : old
            );

            // Plain post arrays: a user's posts/liked posts, community feed.
            queryClient.setQueriesData<Post[]>(
                { predicate: arrayPredicate },
                (old) => (Array.isArray(old) ? flipInArray(old, postId) : old)
            );

            // Search results carry their posts on a `posts` field.
            queryClient.setQueriesData<{ posts?: Post[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.posts
                        ? { ...old, posts: flipInArray(old.posts, postId) }
                        : old
            );

            return { snapshots };
        },

        onError: (_error, _postId, context) => {
            context?.snapshots.forEach(([key, value]) => {
                queryClient.setQueryData(key, value);
            });
        },
    });
}
