import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendMessage, SendMessageInput } from "@/api/messages";
import {
    appendMessageToThreadCache,
    patchConversationListOnMessage,
} from "@/lib/messageCacheHelpers";
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

        onSuccess: (result, variables) => {
            const conversationId = result?.data?.conversationId;
            const sentMessage = result?.data?.message;
            const trimmedPlaintext = variables?.content?.trim() ?? "";

            if (conversationId && sentMessage) {
                const enrichedMessage = {
                    ...sentMessage,
                    isMine: true,
                    deliveryStatus: "delivered" as const,
                    ...(trimmedPlaintext ? { plaintext: trimmedPlaintext } : {}),
                };

                appendMessageToThreadCache(
                    queryClient,
                    conversationId,
                    enrichedMessage,
                    { markReadUpTo: true }
                );

                const patchedList = patchConversationListOnMessage(queryClient, {
                    conversationId,
                    lastMessage: {
                        id: sentMessage.id,
                        content: sentMessage.content,
                        hasPost: Boolean(sentMessage.postId),
                        isMine: true,
                        createdAt: sentMessage.createdAt,
                    },
                    lastMessageAt: sentMessage.createdAt,
                    resetUnread: true,
                });

                if (!patchedList) {
                    void queryClient.invalidateQueries({
                        queryKey: queryKeys.conversations(),
                        exact: true,
                    });
                }
                return;
            }

            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations(),
                exact: true,
            });
        },
    });
}
