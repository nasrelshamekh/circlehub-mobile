import { useQuery } from "@tanstack/react-query";

import { getUserFollowers } from "@/api/users";
import { queryKeys } from "@/lib/queryKeys";

export function useUserFollowers(username: string) {
    const query = useQuery({
        queryKey: queryKeys.userFollowers(username),
        queryFn: async () => {
            const { data } = await getUserFollowers(username);
            return data;
        },
        enabled: Boolean(username),
    });

    return {
        followers: query.data ?? [],
        isLoading: query.isPending && Boolean(username),
    };
}
