import { useChatConnection } from "@/context/chatconnectioncontext";

export function isTypingNow(
    typingUsers: Record<string, number> | undefined,
    userId?: string | null
): boolean {
    if (!userId || !typingUsers) return false;
    const key = userId.toLowerCase();
    return Boolean((typingUsers[key] ?? 0) > 0);
}

export function useTypingIndicator(userId?: string | null): boolean {
    const { typingUsers } = useChatConnection();
    return isTypingNow(typingUsers, userId);
}

export function useTypingUsers(): Record<string, number> {
    const { typingUsers } = useChatConnection();
    return typingUsers;
}
