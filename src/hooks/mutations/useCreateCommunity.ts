import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCommunity } from "@/api/communities";
import { useAuth } from "@/context/authcontext";
import { queryKeys } from "@/lib/queryKeys";
import { CommunityListItem } from "@/types/community";

export default function useCreateCommunity() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: createCommunity,

        onSuccess: (response) => {
            const { communityRole, ...rest } = response.data;

            const community: CommunityListItem = {
                ...rest,
                membershipStatus: "joined",
                viewerRole: communityRole,
            };

            queryClient.setQueryData<CommunityListItem[]>(
                queryKeys.communities(),
                (old) => (old ? [community, ...old] : [community])
            );

            if (user?.username) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.userCommunities(user.username),
                });
            }
        },
    });
}
