import { useQuery } from "@tanstack/react-query";

import { getPostById } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { PostDetails } from "@/types/post";

/**
 * Loads a single post with its comments, mirroring the web app's
 * usePostDetails. The post-details query key (`["post", id]`) is shared with
 * useToggleLike and useAddComment so likes/comments reconcile with the feed.
 */
export function usePostDetails(postId: string | undefined) {
    const query = useQuery<PostDetails>({
        queryKey: queryKeys.post(postId ?? "unknown"),
        queryFn: async () => {
            const { data } = await getPostById(postId ?? "");
            return data;
        },
        enabled: Boolean(postId),
    });

    return {
        post: query.data ?? null,
        isLoading: query.isPending,
    };
}