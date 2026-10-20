import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendMessage, SendMessageInput } from "@/api/messages";
import { queryKeys } from "@/lib/queryKeys";
import { encryptMessageContent } from "@/services/messageCrypto";

export default function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: SendMessageInput) => {
            const content = input.content
                ? await encryptMessageContent({
                      recipientUsername: input.recipientUsername,
                      plaintext: input.content,
                  })
                : input.content;

            return sendMessage({
                ...input,
                content,
            });
        },

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.conversations(),
            });
        },
    });
}
