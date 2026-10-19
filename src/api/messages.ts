import { apiFetch } from "./client";
import { Conversation, ConversationThread, MessageRecipient } from "@/types/message";

export function getConversations() {
    return apiFetch<{ message: string; data: Conversation[] }>(
        "/api/Messages/conversations"
    );
}

export function getConversation(id: string, page = 1, pageSize = 50) {
    return apiFetch<{ message: string; data: ConversationThread }>(
        `/api/Messages/conversations/${id}?page=${page}&pageSize=${pageSize}`
    );
}

export function getMessageRecipients() {
    return apiFetch<{ message: string; data: MessageRecipient[] }>(
        "/api/Messages/recipients"
    );
}

export type SendMessageInput = {
    recipientUsername: string;
    content?: string;
    postId?: string;
};

export function sendMessage(input: SendMessageInput) {
    return apiFetch<{ message: string; data: { conversationId: string } }>(
        "/api/Messages",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }
    );
}
