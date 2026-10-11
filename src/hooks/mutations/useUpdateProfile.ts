import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProfile, UpdateProfileInput } from "@/api/users";
import { useAuth } from "@/context/authcontext";
import { queryKeys } from "@/lib/queryKeys";

export default function useUpdateProfile() {
    const queryClient = useQueryClient();
    const { updateUser } = useAuth();

    return useMutation({
        mutationFn: (input: UpdateProfileInput) => updateProfile(input),

        onSuccess: (response) => {
            updateUser(response.data);

            queryClient.invalidateQueries({
                queryKey: queryKeys.user(response.data.username),
            });
        },
    });
}
