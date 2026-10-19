import { ConversationThread, Message } from "@/types/message";

export function mergeConversationPages(pages: ConversationThread[]): Message[] {
    const seen = new Set<string>();
    const merged: Message[] = [];

    for (let index = pages.length - 1; index >= 0; index -= 1) {
        for (const message of pages[index].messages) {
            if (seen.has(message.id)) continue;

            seen.add(message.id);
            merged.push(message);
        }
    }

    return merged;
}
