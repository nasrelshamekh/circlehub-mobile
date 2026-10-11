import { useQuery } from "@tanstack/react-query";

import { getCommunityPosts } from "@/api/posts";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/types/api";
import { Post } from "@/types/post";

export function useCommunityPosts(communityId: string | undefined) {
    const query = useQuery<Post[]>({
        queryKey: queryKeys.communityPosts(communityId ?? "unknown"),
        queryFn: async () => {
            try {
                const { data } = await getCommunityPosts(communityId ?? "");
                return data;
            } catch (error) {
                if (error instanceof ApiError && error.status === 403) return [];
                throw error;
            }
        },
        enabled: Boolean(communityId),
    });

    return {
        posts: query.data ?? [],
        isLoading: query.isPending && Boolean(communityId),
    };
}
