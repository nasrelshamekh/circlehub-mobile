import {
    InfiniteData,
    QueryKey,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { votePoll } from "@/api/posts";
import { haptics } from "@/lib/haptics";
import { queryKeys } from "@/lib/queryKeys";
import { PageMeta } from "@/types/api";
import { Poll, Post } from "@/types/post";

type FeedPage = { data: Post[]; meta: PageMeta };
type FeedData = InfiniteData<FeedPage>;

function updatePollInPost(post: Post, updatedPoll: Poll): Post {
    return {
        ...post,
        poll: updatedPoll,
    };
}

function updatePollInArray(posts: Post[], postId: string, updatedPoll: Poll): Post[] {
    return posts.map((post) =>
        post.id === postId ? updatePollInPost(post, updatedPoll) : post
    );
}

export default function useVotePoll() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, optionId }: { postId: string; optionId: string }) =>
            votePoll(postId, optionId),

        onSuccess: (response, { postId }) => {
            haptics.light();
            const updatedPoll = response.data;

            const arrayPredicate = (query: { queryKey: QueryKey }) => {
                const [root, , sub] = query.queryKey;
                return (
                    (root === "user" &&
                        (sub === "posts" || sub === "liked-posts")) ||
                    (root === "community" && sub === "posts")
                );
            };

            queryClient.setQueryData<FeedData>(queryKeys.feed(), (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: updatePollInArray(page.data, postId, updatedPoll),
                    })),
                };
            });

            queryClient.setQueryData<Post>(queryKeys.post(postId), (old) =>
                old ? updatePollInPost(old, updatedPoll) : old
            );

            queryClient.setQueriesData<Post[]>(
                { predicate: arrayPredicate },
                (old) =>
                    Array.isArray(old)
                        ? updatePollInArray(old, postId, updatedPoll)
                        : old
            );

            queryClient.setQueriesData<{ posts?: Post[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.posts
                        ? {
                              ...old,
                              posts: updatePollInArray(
                                  old.posts,
                                  postId,
                                  updatedPoll
                              ),
                          }
                        : old
            );
        },
    });
}
