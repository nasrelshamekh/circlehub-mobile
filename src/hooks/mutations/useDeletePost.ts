import {
    InfiniteData,
    QueryKey,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { deleteCommunityPost, deletePost } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { PageMeta } from "@/types/api";
import { Post } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };
type FeedData = InfiniteData<FeedPage>;

type DeletePostInput = {
    post: Post;

    community?: { id: string; slug: string } | null;
};

function withoutPost(posts: Post[], postId: string) {
    return posts.filter((post) => post.id !== postId);
}

export default function useDeletePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ post, community }: DeletePostInput) => {
            const target = community ?? post.community;

            return target
                ? deleteCommunityPost(target.id, post.id)
                : deletePost(post.id);
        },

        onMutate: async ({ post, community }) => {
            await queryClient.cancelQueries();

            const snapshots: [QueryKey, unknown][] = queryClient.getQueriesData({
                predicate: () => true,
            });

            const postId = post.id;
            const target = community ?? post.community;

            queryClient.setQueryData<FeedData>(queryKeys.feed(), (old) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: withoutPost(page.data, postId),
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
                (old) => (Array.isArray(old) ? withoutPost(old, postId) : old)
            );

            queryClient.setQueriesData<{ posts?: Post[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.posts
                        ? { ...old, posts: withoutPost(old.posts, postId) }
                        : old
            );

            queryClient.setQueryData<{ postsCount?: number }>(
                queryKeys.user(post.author.username),
                (old) =>
                    old
                        ? {
                              ...old,
                              postsCount: Math.max(0, (old.postsCount ?? 0) - 1),
                          }
                        : old
            );

            if (target?.slug) {
                queryClient.setQueryData<{ postsCount?: number }>(
                    queryKeys.community(target.slug),
                    (old) =>
                        old
                            ? {
                                  ...old,
                                  postsCount: Math.max(
                                      0,
                                      (old.postsCount ?? 0) - 1
                                  ),
                              }
                            : old
                );
            }

            return { snapshots };
        },

        onError: (_error, _input, context) => {
            context?.snapshots.forEach(([key, value]) => {
                queryClient.setQueryData(key, value);
            });
        },

        onSuccess: (_data, { post }) => {
            queryClient.removeQueries({ queryKey: queryKeys.post(post.id) });
        },
    });
}
