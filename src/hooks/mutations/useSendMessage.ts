import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendMessage, SendMessageInput } from "@/api/messages";
import {
    appendMessageToThreadCache,
    patchConversationListOnMessage,
} from "@/lib/messageCacheHelpers";
import { queryKeys } from "@/lib/queryKeys";
import { encryptMessageContent } from "@/services/messageCrypto";
import { parseGifContent } from "@/services/gifService";

export default function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: SendMessageInput & { clientTempId?: string }) => {
            const rawContent = input.content?.trim();
            const content = rawContent
                ? await encryptMessageContent({
                      recipientUsername: input.recipientUsername,
                      plaintext: rawContent,
                  })
                : input.content;

            let previewText: string | undefined = undefined;
            if (rawContent) {
                const { text, gifUrl } = parseGifContent(rawContent);
                if (gifUrl) {
                    previewText = text ? `${text.slice(0, 100)} [GIF]` : "Sent a GIF";
                } else {
                    previewText = rawContent.slice(0, 150);
                }
            }

            const res = await sendMessage({
                ...input,
                content,
                previewText,
            });
            return {
                ...res,
                clientTempId: input.clientTempId,
            };
        },

        onSuccess: (result, variables) => {
            const conversationId = result?.data?.conversationId;
            const sentMessage = result?.data?.message;
            const clientTempId =
                (result as { clientTempId?: string })?.clientTempId ??
                (variables as { clientTempId?: string })?.clientTempId;
            const trimmedPlaintext = variables?.content?.trim() ?? "";

            if (conversationId && sentMessage) {
                const enrichedMessage = {
                    ...sentMessage,
                    isMine: true,
                    deliveryStatus: "delivered" as const,
                    ...(clientTempId ? { clientTempId } : {}),
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
