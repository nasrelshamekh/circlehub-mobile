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
    const connection = new HubConnectionBuilder()
        .withUrl(resolveHubUrl(), {
            accessTokenFactory: async () => (await getToken()) ?? "",
        })
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: (retryContext) => {
                // Immediate retry on first drop so reconnect is instantaneous
                if (retryContext.previousRetryCount === 0) return 0;
                if (retryContext.previousRetryCount === 1) return 1_000;
                if (retryContext.previousRetryCount === 2) return 2_000;
                if (retryContext.previousRetryCount === 3) return 5_000;
                return 10_000;
            },
        })
        .configureLogging(LogLevel.None)
        .build();

    // 10s keepalive ping prevents reverse proxies / IIS from dropping idle connections.
    // 60s server timeout gives mobile connections a forgiving buffer before treating a link as dead.
    connection.keepAliveIntervalInMilliseconds = 10_000;
    connection.serverTimeoutInMilliseconds = 60_000;

    return connection;
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
