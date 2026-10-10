import { useInfiniteQuery } from "@tanstack/react-query";

import { getPosts } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";

const PAGE_SIZE = 10;

export default function useFeedPosts() {
    const query = useInfiniteQuery({
        queryKey: queryKeys.feed(),
        queryFn: ({ pageParam }) => getPosts(pageParam, PAGE_SIZE),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
    });

    const posts = query.data?.pages.flatMap((page) => page.data) ?? [];

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