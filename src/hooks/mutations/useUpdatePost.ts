import {
    InfiniteData,
    QueryKey,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { updatePost } from "@/api/posts";
import { UploadImage } from "@/lib/imageUpload";
import { queryKeys } from "@/lib/queryKeys";
import { PageMeta } from "@/types/api";
import { Post, PostDetails } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };
type FeedData = InfiniteData<FeedPage>;

type UpdatePostInput = {
    postId: string;
    content: string;
    image?: UploadImage | null;
};

// The update response omits `community`, so spread onto the cached post to keep it.
function replaceInArray(posts: Post[], updated: Post) {
    return posts.map((post) =>
        post.id === updated.id ? { ...post, ...updated } : post
    );
}

export default function useUpdatePost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, content, image }: UpdatePostInput) =>
            updatePost(postId, content, image),

        onSuccess: ({ data: updated }) => {
            // The details cache also holds the loaded comments; keep them.
            queryClient.setQueryData<PostDetails>(
                queryKeys.post(updated.id),
                (old) =>
                    old
                        ? { ...old, ...updated, comments: old.comments }
                        : old
            );

            queryClient.setQueryData<FeedData>(queryKeys.feed(), (old) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: replaceInArray(page.data, updated),
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
                    Array.isArray(old) ? replaceInArray(old, updated) : old
            );

            // Search results carry their posts on a `posts` field.
            queryClient.setQueriesData<{ posts?: Post[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.posts
                        ? { ...old, posts: replaceInArray(old.posts, updated) }
                        : old
            );
        },
    });
}
