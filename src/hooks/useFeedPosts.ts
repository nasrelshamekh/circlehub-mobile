import { useInfiniteQuery } from "@tanstack/react-query";

import { getPosts } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { Post } from "@/types/post";

const PAGE_SIZE = 10;

export default function useFeedPosts() {
    const query = useInfiniteQuery({
        queryKey: queryKeys.feed(),
        queryFn: ({ pageParam }) => getPosts(pageParam, PAGE_SIZE),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
    });

    const seen = new Set<string>();
    const posts: Post[] = [];

    for (const page of query.data?.pages ?? []) {
        for (const post of page.data) {
            if (seen.has(post.id)) continue;

            seen.add(post.id);
            posts.push(post);
        }
    }

    return {
        posts,
        isLoading: query.isPending,
        isLoadingMore: query.isFetchingNextPage,
        hasMore: Boolean(query.hasNextPage),
        loadMore: query.fetchNextPage,
        isRefetching: query.isRefetching,
        refetch: query.refetch,
        error: query.error,
    };
}
