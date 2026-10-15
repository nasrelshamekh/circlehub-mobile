import { useQuery } from "@tanstack/react-query";

import { getMessageRecipients } from "@/api/messages";
import { queryKeys } from "@/lib/queryKeys";

export function useMessageRecipients(enabled = true) {
    const query = useQuery({
        queryKey: queryKeys.messageRecipients(),
        enabled,
        queryFn: async () => {
            const { data } = await getMessageRecipients();
            return data;
        },
    });

    return {
        recipients: query.data ?? [],
        isLoading: query.isPending && enabled,
        error: query.error,
    };
}
