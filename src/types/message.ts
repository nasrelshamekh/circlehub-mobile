import { Post } from "@/types/post";

export type MessageUser = {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    isOnline?: boolean;
    lastSeenAt?: string | null;
};

export type MessagePreview = {
    id: string;
    content?: string | null;
    hasPost: boolean;
    isMine: boolean;
    createdAt: string;
};

export type Conversation = {
    id: string;
    otherUser: MessageUser;
    lastMessageAt: string;
    unreadCount: number;
    lastMessage?: MessagePreview | null;
};

export type MessageDeliveryStatus = "sending" | "sent" | "delivered" | "failed";

export type Message = {
    id: string;
    content?: string | null;
    postId?: string | null;
    post?: Post | null;
    createdAt: string;
    isMine: boolean;
    sender: MessageUser;
    pending?: boolean;
    failed?: boolean;
    plaintext?: string;
    deliveryStatus?: MessageDeliveryStatus;
    realId?: string;
    clientTempId?: string;
};

export type ConversationThread = {
    id: string;
    otherUser: MessageUser;
    messages: Message[];
    hasMore: boolean;
};

export type MessageRecipient = {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    messagesFrom: string;
    canMessage: boolean;
};
