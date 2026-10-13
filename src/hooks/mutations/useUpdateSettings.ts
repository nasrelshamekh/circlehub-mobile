import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateSettings, UpdateSettingsInput } from "@/api/users";
import { useAuth } from "@/context/authcontext";
import { queryKeys } from "@/lib/queryKeys";

export default function useUpdateSettings() {
    const queryClient = useQueryClient();
    const { updateUser } = useAuth();

    return useMutation({
        mutationFn: (input: UpdateSettingsInput) => updateSettings(input),

        onSuccess: (response) => {
            updateUser(response.data);

            queryClient.invalidateQueries({
                queryKey: queryKeys.user(response.data.username),
            });
        },
    });
}
