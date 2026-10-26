import {
    InfiniteData,
    QueryKey,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { toggleLike } from "@/api/posts";
import { haptics } from "@/lib/haptics";
import { queryKeys } from "@/lib/queryKeys";
import { PageMeta } from "@/types/api";
import { Post } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };
type FeedData = InfiniteData<FeedPage>;

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

export default function useToggleLike() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: string) => toggleLike(postId),

        onMutate: async (postId) => {
            haptics.light();
            await queryClient.cancelQueries();

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

            queryClient.setQueryData<Post>(queryKeys.post(postId), (old) =>
                old ? flipLike(old) : old
            );

            queryClient.setQueriesData<Post[]>(
                { predicate: arrayPredicate },
                (old) => (Array.isArray(old) ? flipInArray(old, postId) : old)
            );

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
