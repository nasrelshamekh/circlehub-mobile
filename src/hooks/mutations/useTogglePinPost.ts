import { useMutation, useQueryClient } from "@tanstack/react-query";

import { togglePinPost } from "@/api/posts";
import { haptics } from "@/lib/haptics";
import { queryKeys } from "@/lib/queryKeys";

export default function useTogglePinPost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId }: { postId: string; communityId?: string }) =>
            togglePinPost(postId),

        onSuccess: (_response, { postId, communityId }) => {
            haptics.success();
            queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
            if (communityId) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.communityPosts(communityId),
                });
            }
            queryClient.invalidateQueries({
                predicate: (query) => {
                    const [root, , sub] = query.queryKey;
                    return root === "community" && sub === "posts";
                },
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
        },

        onError: () => {
            haptics.error();
        },
    });
}
