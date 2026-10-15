import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendMessage, SendMessageInput } from "@/api/messages";
import { queryKeys } from "@/lib/queryKeys";

export default function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: SendMessageInput) => sendMessage(input),

        onSuccess: () => {
            // The "conversations" prefix also covers every open thread.
            queryClient.invalidateQueries({
                queryKey: queryKeys.conversations(),
            });
        },
    });
}
