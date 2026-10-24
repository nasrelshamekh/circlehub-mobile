import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendMessage, SendMessageInput } from "@/api/messages";
import { queryKeys } from "@/lib/queryKeys";
import { encryptMessageContent } from "@/services/messageCrypto";

export default function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: SendMessageInput) => {
            const rawContent = input.content?.trim();
            const content = rawContent
                ? await encryptMessageContent({
                      recipientUsername: input.recipientUsername,
                      plaintext: rawContent,
                  })
                : input.content;

            return sendMessage({
                ...input,
                content,
                previewText: rawContent ? rawContent.slice(0, 150) : undefined,
            });
        },

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.conversations(),
                exact: true,
            });
        },
    });
}
