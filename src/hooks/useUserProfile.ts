import { useQuery } from "@tanstack/react-query";

import { getUserProfile } from "@/api/users";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/types/api";
import { UserProfile } from "@/types/user";

export function useUserProfile(username: string) {
    const query = useQuery<UserProfile | null>({
        queryKey: queryKeys.user(username),
        queryFn: async () => {
            try {
                const { data } = await getUserProfile(username);
                return data;
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) return null;
                throw error;
            }
        },
        enabled: Boolean(username),
    });

    return {
        user: query.data ?? null,
        isLoading: query.isPending && Boolean(username),
    };
}