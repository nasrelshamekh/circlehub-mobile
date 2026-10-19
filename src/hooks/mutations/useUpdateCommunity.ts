import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCommunity, UpdateCommunityInput } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";
import {
    CommunityDetails,
    CommunityListItem,
    CommunityPatch,
} from "@/types/community";

type UpdateCommunityVars = {
    communityId: string;
    slug: string;
    input: UpdateCommunityInput;
};

function patchFrom(data: CommunityPatch): Partial<CommunityListItem> {
    return {
        name: data.name,
        slug: data.slug,
        category: data.category,
        description: data.description,
        imageUrl: data.imageUrl,
        coverImageUrl: data.coverImageUrl,
        visibility: data.visibility,
        admin: data.admin,
        membersCount: data.membersCount,
        postsCount: data.postsCount,
    };
}

export default function useUpdateCommunity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ communityId, input }: UpdateCommunityVars) =>
            updateCommunity(communityId, input),

        onSuccess: (response, { slug }) => {
            const patch = patchFrom(response.data);
            const matches = (community: { id: string }) =>
                community.id === response.data.id;

            queryClient.setQueryData<CommunityDetails>(
                queryKeys.community(slug),
                (old) => (old ? { ...old, ...patch } : old)
            );

            queryClient.setQueryData<CommunityListItem[]>(
                queryKeys.communities(),
                (old) =>
                    old?.map((community) =>
                        matches(community)
                            ? { ...community, ...patch }
                            : community
                    )
            );

            queryClient.setQueriesData<{ communities?: CommunityListItem[] }>(
                { queryKey: ["search"] },
                (old) =>
                    old?.communities
                        ? {
                              ...old,
                              communities: old.communities.map((community) =>
                                  matches(community)
                                      ? { ...community, ...patch }
                                      : community
                              ),
                          }
                        : old
            );
        },
    });
}
