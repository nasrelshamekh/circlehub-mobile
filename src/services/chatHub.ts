import {
    HubConnection,
    HubConnectionBuilder,
    HubConnectionState,
    LogLevel,
} from "@microsoft/signalr";

import { API_URL } from "@/config/env";
import { getToken } from "@/lib/session";

export const RECEIVE_MESSAGE_EVENT = "ReceiveEncryptedMessage";
export const PRESENCE_CHANGED_EVENT = "PresenceChanged";
export const TYPING_CHANGED_EVENT = "TypingChanged";
export const NOTIFICATION_CREATED_EVENT = "NotificationCreated";
export const NOTIFICATION_DELETED_EVENT = "NotificationDeleted";
export const POST_CREATED_EVENT = "PostCreated";
export const SEND_TYPING_METHOD = "SendTyping";

const HUB_PATH = "/hubs/chat";

export function resolveHubUrl(baseUrl = API_URL): string {
    const trimmed = (baseUrl ?? "").replace(/\/+$/, "");
    return `${trimmed.replace(/\/api$/, "")}${HUB_PATH}`;
}

export function createChatConnection(): HubConnection {
    return new HubConnectionBuilder()
        .withUrl(resolveHubUrl(), {
            accessTokenFactory: async () => (await getToken()) ?? "",
        })
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: () => 10_000,
        })
        .configureLogging(LogLevel.None)
        .build();
}

export function sendTyping(
    connection: HubConnection | null,
    recipientId: string,
    isTyping: boolean
): boolean {
    if (!connection || connection.state !== HubConnectionState.Connected) {
        return false;
    }

    connection.invoke(SEND_TYPING_METHOD, recipientId, isTyping).catch(() => {});
    return true;
}
