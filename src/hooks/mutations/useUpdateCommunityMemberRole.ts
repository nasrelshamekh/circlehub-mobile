import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCommunityMemberRole } from "@/api/communities";
import { queryKeys } from "@/lib/queryKeys";
import { CommunityMember } from "@/types/community";

const ROLE_RANK: Record<string, number> = {
    admin: 0,
    moderator: 1,
    member: 2,
};

function sortMembersByRole(members: CommunityMember[]) {
    return [...members].sort(
        (a, b) =>
            (ROLE_RANK[a.communityRole] ?? 3) -
            (ROLE_RANK[b.communityRole] ?? 3)
    );
}

type UpdateRoleVars = {
    communityId: string;
    membershipId: string;
    role: "member" | "moderator";
};

export default function useUpdateCommunityMemberRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ communityId, membershipId, role }: UpdateRoleVars) =>
            updateCommunityMemberRole(communityId, membershipId, role),

        onMutate: async ({ communityId, membershipId, role }) => {
            const key = queryKeys.communityMembers(communityId);

            await queryClient.cancelQueries({ queryKey: key });

            const previous = queryClient.getQueryData<CommunityMember[]>(key);

            queryClient.setQueryData<CommunityMember[]>(key, (old = []) =>
                sortMembersByRole(
                    old.map((member) =>
                        member.membershipId === membershipId
                            ? { ...member, communityRole: role }
                            : member
                    )
                )
            );

            return { previous };
        },

        onError: (_error, variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    queryKeys.communityMembers(variables.communityId),
                    context.previous
                );
            }
        },
    });
}
