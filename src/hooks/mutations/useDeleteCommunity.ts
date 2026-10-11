import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteCommunity } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";
import { CommunityListItem } from "@/types/community";

export default function useDeleteCommunity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (communityId: string) => deleteCommunity(communityId),

        onSuccess: (_response, communityId) => {
            queryClient.removeQueries({
                predicate: (query) => {
                    const [root, , sub] = query.queryKey;
                    return (
                        root === "community" ||
                        (root === "user" && sub === "communities")
                    );
                },
            });

            queryClient.setQueryData<CommunityListItem[]>(
                queryKeys.communities(),
                (old) =>
                    old?.filter((community) => community.id !== communityId)
            );
        },
    });
}
