import { useQuery } from "@tanstack/react-query";

import { getPostById } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { PostDetails } from "@/types/post";

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