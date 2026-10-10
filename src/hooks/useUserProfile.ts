import { useQuery } from "@tanstack/react-query";

import { getUserProfile } from "@/api/users";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/types/api";
import { UserProfile } from "@/types/user";

/**
 * Loads the profile for a username, mirroring the web app's useUserProfile.
 * A 404 resolves to null (profile not found) so the page can render its
 * not-found state instead of throwing.
 */
export function useUserProfile(username: string) {
    const query = useQuery<UserProfile | null>({
        queryKey: queryKeys.user(username),
        queryFn: async () => {
            try {
                const { data } = await getUserProfile(username);
                return data;
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                    return null;
                }
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