import { mergeConversationPages } from "@/lib/messagePages";
import { ConversationThread, Message, MessageUser } from "@/types/message";

const otherUser: MessageUser = {
    id: "user-2",
    name: "Grace Hopper",
    username: "grace",
    avatarUrl: null,
};

function makeMessage(id: string, createdAt: string): Message {
    return {
        id,
        content: `message ${id}`,
        postId: null,
        post: null,
        createdAt,
        isMine: false,
        sender: otherUser,
    };
}

function makePage(
    messages: Message[],
    overrides: Partial<ConversationThread> = {}
): ConversationThread {
    return {
        id: "conversation-1",
        otherUser,
        messages,
        hasMore: false,
        ...overrides,
    };
}

describe("mergeConversationPages", () => {
    it("returns an empty list when there are no pages", () => {
        expect(mergeConversationPages([])).toEqual([]);
    });

    it("keeps a single page in chronological order", () => {
        const page = makePage([
            makeMessage("1", "2026-01-01T09:00:00Z"),
            makeMessage("2", "2026-01-01T09:01:00Z"),
        ]);

        expect(mergeConversationPages([page]).map((m) => m.id)).toEqual([
            "1",
            "2",
        ]);
    });

    it("places older pages before newer ones", () => {
        const newestPage = makePage([
            makeMessage("3", "2026-01-01T09:02:00Z"),
            makeMessage("4", "2026-01-01T09:03:00Z"),
        ]);
        const olderPage = makePage([
            makeMessage("1", "2026-01-01T09:00:00Z"),
            makeMessage("2", "2026-01-01T09:01:00Z"),
        ]);

        expect(
            mergeConversationPages([newestPage, olderPage]).map((m) => m.id)
        ).toEqual(["1", "2", "3", "4"]);
    });

    it("drops messages that appear in more than one page", () => {
        const newestPage = makePage([
            makeMessage("2", "2026-01-01T09:01:00Z"),
            makeMessage("3", "2026-01-01T09:02:00Z"),
        ]);
        const olderPage = makePage([
            makeMessage("1", "2026-01-01T09:00:00Z"),
            makeMessage("2", "2026-01-01T09:01:00Z"),
        ]);

        expect(
            mergeConversationPages([newestPage, olderPage]).map((m) => m.id)
        ).toEqual(["1", "2", "3"]);
    });
});
