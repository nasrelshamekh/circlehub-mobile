import { apiFetch } from "./client";
import {
    Conversation,
    ConversationThread,
    Message,
    MessageRecipient,
} from "@/types/message";

export type { MessageRecipient };

export function getConversations() {
    return apiFetch<{ message: string; data: Conversation[] }>(
        "/api/Messages/conversations"
    );
}

export function getConversation(
    id: string,
    page = 1,
    pageSize = 25,
    markRead = true
) {
    const suffix = markRead ? "" : "&markRead=false";
    return apiFetch<{ message: string; data: ConversationThread }>(
        `/api/Messages/conversations/${id}?page=${page}&pageSize=${pageSize}${suffix}`
    );
}

export function markConversationRead(id: string) {
    return apiFetch<void>(`/api/Messages/conversations/${id}/read`, {
        method: "POST",
    });
}

export function getMessageRecipients() {
    return apiFetch<{ message: string; data: MessageRecipient[] }>(
        "/api/Messages/recipients"
    );
}

export type StartConversationInput = {
    recipientId?: string;
    recipientUsername?: string;
};

export type StartConversationResult = {
    conversationId: string;
    otherUser: {
        id: string;
        name: string;
        username: string;
        avatarUrl: string | null;
        isOnline: boolean;
        lastSeenAt: string | null;
    };
    isNew: boolean;
};

export function getOrCreateConversation(input: StartConversationInput) {
    return apiFetch<{
        message: string;
        data: StartConversationResult;
    }>("/api/Messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
}

export type SendMessageInput = {
    recipientUsername: string;
    content?: string;
    previewText?: string;
    postId?: string;
};

export function sendMessage(input: SendMessageInput) {
    return apiFetch<{
        message: string;
        data: { conversationId: string; message?: Message };
    }>("/api/Messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
}
