import { useQuery } from "@tanstack/react-query";

import { getUserCommunities } from "@/api/users";
import { queryKeys } from "@/lib/queryKeys";

export function useUserCommunities(username: string) {
    const query = useQuery({
        queryKey: queryKeys.userCommunities(username),
        queryFn: async () => {
            const { data } = await getUserCommunities(username);
            return data;
        },
        enabled: Boolean(username),
    });

    return {
        communities: query.data ?? [],
        isLoading: query.isPending && Boolean(username),
    };
}