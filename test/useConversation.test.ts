import { waitFor } from "@testing-library/react-native";

import * as messagesApi from "@/api/messages";
import {
    conversationQueryOptions,
    useConversation,
} from "@/hooks/useConversation";
import { queryKeys } from "@/lib/queryKeys";
import { ConversationThread } from "@/types/message";
import { renderHookWithQueryClient } from "./helpers";

jest.mock("@/api/messages");
jest.mock("@/services/messageCrypto", () => ({
    peekDecrypted: jest.fn(() => null),
    decryptMessageContent: jest.fn(async (c: string) => c),
}));

const mockGetConversation = jest.mocked(messagesApi.getConversation);

const CONVERSATION_ID = "conv-123";

const page1: ConversationThread = {
    id: CONVERSATION_ID,
    otherUser: {
        id: "user-2",
        name: "Jane Doe",
        username: "janedoe",
        avatarUrl: null,
    },
    messages: [
        {
            id: "m-1",
            content: "Hello",
            createdAt: new Date().toISOString(),
            isMine: false,
            sender: {
                id: "user-2",
                name: "Jane Doe",
                username: "janedoe",
                avatarUrl: null,
            },
        },
    ],
    hasMore: true,
};

const page2: ConversationThread = {
    id: CONVERSATION_ID,
    otherUser: page1.otherUser,
    messages: [
        {
            id: "m-2",
            content: "Earlier message",
            createdAt: new Date(Date.now() - 60000).toISOString(),
            isMine: true,
            sender: {
                id: "user-1",
                name: "John Doe",
                username: "johndoe",
                avatarUrl: null,
            },
        },
    ],
    hasMore: false,
};

describe("useConversation", () => {
    beforeEach(() => {
        mockGetConversation.mockReset();
    });

    it("loads thread and merges pages", async () => {
        mockGetConversation
            .mockResolvedValueOnce({
                message: "ok",
                data: page1,
            })
            .mockResolvedValueOnce({
                message: "ok",
                data: page2,
            });

        const { queryClient, result } = await renderHookWithQueryClient(
            () => useConversation(CONVERSATION_ID)
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.conversation?.id).toBe(CONVERSATION_ID);
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.hasMore).toBe(true);

        result.current.loadOlder();

        await waitFor(() =>
            expect(result.current.messages.length).toBeGreaterThan(1)
        );

        const cached = queryClient.getQueryData<{
            pages: ConversationThread[];
        }>(queryKeys.conversation(CONVERSATION_ID));
        expect(cached?.pages.length).toBeGreaterThan(1);

        // This is what `ConversationRow.prewarmConversation()` does on touch-down.
        const prewarmOptions = conversationQueryOptions(CONVERSATION_ID);
        await queryClient.prefetchInfiniteQuery(prewarmOptions);

        const query = queryClient.getQueryCache().find({
            queryKey: queryKeys.conversation(CONVERSATION_ID),
        });

        expect(query?.state.error ?? null).toBeNull();
        expect((query?.state.data as any)?.pages?.length).toBeGreaterThan(1);
    });

    it("respects enabled: false and does not fetch when disabled", async () => {
        mockGetConversation.mockClear();

        const { result } = await renderHookWithQueryClient(() =>
            useConversation("inactive-conv-id", { enabled: false })
        );

        expect(result.current.isLoading).toBe(false);
        expect(mockGetConversation).not.toHaveBeenCalled();
        expect(result.current.messages).toEqual([]);
    });
});
