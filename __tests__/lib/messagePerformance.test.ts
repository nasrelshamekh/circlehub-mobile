import { waitFor } from "@testing-library/react-native";
import { QueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";

import * as messagesApi from "@/api/messages";
import { fetchConversationThread } from "@/hooks/useConversation";
import {
    appendMessageToThreadCache,
    clearConversationUnreadInCache,
    ConversationThreadWithMeta,
    patchConversationListOnMessage,
} from "@/lib/messageCacheHelpers";
import { queryKeys } from "@/lib/queryKeys";
import * as session from "@/lib/session";
import {
    clearDecryptCache,
    decryptMessageContent,
    ENC_PREFIX,
    peekDecrypted,
} from "@/services/messageCrypto";
import {
    attachThreadCachePersistence,
    clearThreadCache,
    hydrateThreadCache,
} from "@/services/threadCache";
import { Conversation, Message } from "@/types/message";

const mockSecureStoreData: Record<string, string> = {};
const mockFiles: Record<string, string> = {};

jest.mock("expo-secure-store", () => ({
    getItemAsync: jest.fn(async (key: string) => mockSecureStoreData[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
        mockSecureStoreData[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
        delete mockSecureStoreData[key];
    }),
}));

jest.mock("expo-file-system/legacy", () => ({
    cacheDirectory: "file:///mock-cache/",
    getInfoAsync: jest.fn(async (uri: string) => ({
        exists: Object.prototype.hasOwnProperty.call(mockFiles, uri),
    })),
    readAsStringAsync: jest.fn(async (uri: string) => mockFiles[uri] ?? ""),
    writeAsStringAsync: jest.fn(async (uri: string, content: string) => {
        mockFiles[uri] = content;
    }),
    deleteAsync: jest.fn(async (uri: string) => {
        delete mockFiles[uri];
    }),
}));

jest.mock("expo-crypto", () => ({
    getRandomBytes: jest.fn((size: number) => {
        const out = new Uint8Array(size);
        for (let i = 0; i < size; i += 1) {
            out[i] = (i * 29 + 19) & 0xff;
        }
        return out;
    }),
    randomUUID: jest.fn(() => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
}));

jest.mock("@/api/messages");

const mockGetConversation = jest.mocked(messagesApi.getConversation);

function makeMessage(id: string, content: string, isMine = false): Message {
    return {
        id,
        content,
        createdAt: "2026-10-27T12:00:00.000Z",
        isMine,
        sender: {
            id: isMine ? "user-1" : "user-2",
            name: isMine ? "Alice" : "Bob",
            username: isMine ? "alice" : "bob",
            avatarUrl: null,
        },
    };
}

describe("messaging performance optimizations (P0 + P1 + P2)", () => {
    beforeEach(async () => {
        clearDecryptCache();
        for (const key of Object.keys(mockSecureStoreData)) {
            delete mockSecureStoreData[key];
        }
        for (const uri of Object.keys(mockFiles)) {
            delete mockFiles[uri];
        }
        await session.clearToken();
        jest.clearAllMocks();
    });

    it("caches auth token in memory to avoid repeated SecureStore bridge reads", async () => {
        mockSecureStoreData.auth_token = "jwt-initial";

        // Reset isolated session module so cachedToken starts undefined
        let freshSession: typeof session;
        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            freshSession = require("@/lib/session");
        });

        await expect(freshSession!.getToken()).resolves.toBe("jwt-initial");
        await expect(freshSession!.getToken()).resolves.toBe("jwt-initial");
        await expect(freshSession!.getToken()).resolves.toBe("jwt-initial");
        expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);

        await freshSession!.setToken("jwt-updated");
        jest.mocked(SecureStore.getItemAsync).mockClear();
        await expect(freshSession!.getToken()).resolves.toBe("jwt-updated");
        expect(SecureStore.getItemAsync).not.toHaveBeenCalled();

        await freshSession!.clearToken();
        await expect(freshSession!.getToken()).resolves.toBeNull();
        expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it("deduplicates SignalR echo + send mutation appends and updates conversation list in-memory", () => {
        const queryClient = new QueryClient();
        const convId = "3FA85F64-5717-4562-B3FC-2C963F66AFA6";

        const initialThread: ConversationThreadWithMeta = {
            id: convId,
            otherUser: {
                id: "user-2",
                name: "Bob",
                username: "bob",
                avatarUrl: null,
            },
            messages: [makeMessage("msg-1", "Hi")],
            hasMore: false,
        };

        queryClient.setQueryData(queryKeys.conversation(convId.toLowerCase()), {
            pages: [initialThread],
            pageParams: [1],
        });

        const list: Conversation[] = [
            {
                id: "other-conv",
                otherUser: {
                    id: "user-3",
                    name: "Carol",
                    username: "carol",
                    avatarUrl: null,
                },
                lastMessageAt: "2026-10-27T11:59:00.000Z",
                unreadCount: 0,
                lastMessage: null,
            },
            {
                id: convId.toLowerCase(),
                otherUser: initialThread.otherUser,
                lastMessageAt: "2026-10-27T11:00:00.000Z",
                unreadCount: 2,
                lastMessage: {
                    id: "msg-1",
                    content: "Hi",
                    hasPost: false,
                    isMine: false,
                    createdAt: "2026-10-27T11:00:00.000Z",
                },
            },
        ];
        queryClient.setQueryData(queryKeys.conversations(), list);

        // 1. SignalR own-echo arrives first (uppercase GUIDs, ciphertext only)
        appendMessageToThreadCache(
            queryClient,
            convId,
            makeMessage("MSG-2", `${ENC_PREFIX}cipher`, true)
        );
        // 2. HTTP mutation resolves second (lowercase GUID, carries plaintext)
        appendMessageToThreadCache(
            queryClient,
            convId.toLowerCase(),
            {
                ...makeMessage("msg-2", `${ENC_PREFIX}cipher`, true),
                plaintext: "Instant hello",
            },
            { markReadUpTo: true }
        );

        const updatedThread = queryClient.getQueryData<{
            pages: ConversationThreadWithMeta[];
        }>(queryKeys.conversation(convId.toLowerCase()));

        expect(updatedThread?.pages[0].messages).toHaveLength(2);
        expect(updatedThread?.pages[0].messages[1].plaintext).toBe("Instant hello");
        expect(updatedThread?.pages[0]._markedReadNewestId).toBe("msg-2");

        const patched = patchConversationListOnMessage(queryClient, {
            conversationId: convId,
            lastMessage: {
                id: "msg-2",
                content: `${ENC_PREFIX}cipher`,
                hasPost: false,
                isMine: true,
                createdAt: "2026-10-27T12:01:00.000Z",
            },
            lastMessageAt: "2026-10-27T12:01:00.000Z",
            resetUnread: true,
        });

        expect(patched).toBe(true);
        const updatedList = queryClient.getQueryData<Conversation[]>(
            queryKeys.conversations()
        )!;
        expect(updatedList[0].id).toBe(convId.toLowerCase());
        expect(updatedList[0].unreadCount).toBe(0);

        // Incoming message increments unread once even if processed twice
        patchConversationListOnMessage(queryClient, {
            conversationId: convId,
            lastMessage: {
                id: "msg-3",
                content: "New incoming",
                hasPost: false,
                isMine: false,
                createdAt: "2026-10-27T12:02:00.000Z",
            },
            lastMessageAt: "2026-10-27T12:02:00.000Z",
            unreadDelta: 1,
        });
        patchConversationListOnMessage(queryClient, {
            conversationId: convId,
            lastMessage: {
                id: "msg-3",
                content: "New incoming",
                hasPost: false,
                isMine: false,
                createdAt: "2026-10-27T12:02:00.000Z",
            },
            lastMessageAt: "2026-10-27T12:02:00.000Z",
            unreadDelta: 1,
        });

        expect(
            queryClient.getQueryData<Conversation[]>(queryKeys.conversations())![0]
                .unreadCount
        ).toBe(1);

        const clearRes = clearConversationUnreadInCache(queryClient, convId);
        expect(clearRes).toEqual({ found: true, cleared: true });
        expect(
            queryClient.getQueryData<Conversation[]>(queryKeys.conversations())![0]
                .unreadCount
        ).toBe(0);
    });

    it("encrypts thread cache on disk with AES-256-GCM, hydrates in 0 network calls, and wipes on sign-out", async () => {
        jest.useFakeTimers();
        try {
            const writerClient = new QueryClient();
            const detach = attachThreadCachePersistence(writerClient, "user-1");

            const secretPlaintext = "SUPER_SECRET_DECRYPTED_BODY_9912";
            const wireCipher = `${ENC_PREFIX}${btoa(secretPlaintext)}`;
            await decryptMessageContent(wireCipher);

            writerClient.setQueryData(queryKeys.conversations(), [
                {
                    id: "conv-alpha",
                    otherUser: {
                        id: "user-2",
                        name: "Bob",
                        username: "bob",
                        avatarUrl: null,
                    },
                    lastMessageAt: "2026-10-27T12:00:00.000Z",
                    unreadCount: 0,
                    lastMessage: {
                        id: "m-1",
                        content: wireCipher,
                        hasPost: false,
                        isMine: false,
                        createdAt: "2026-10-27T12:00:00.000Z",
                    },
                },
            ]);

            writerClient.setQueryData(queryKeys.conversation("conv-alpha"), {
                pages: [
                    {
                        id: "conv-alpha",
                        otherUser: {
                            id: "user-2",
                            name: "Bob",
                            username: "bob",
                            avatarUrl: null,
                        },
                        messages: [
                            {
                                ...makeMessage("m-1", wireCipher),
                                plaintext: secretPlaintext,
                            },
                        ],
                        hasMore: false,
                    },
                ],
                pageParams: [1],
            });

            jest.advanceTimersByTime(1200);
            jest.useRealTimers();
            await new Promise((r) => setTimeout(r, 20));
            detach();

            const savedUri = "file:///mock-cache/circlehub_msgcache_v1.enc";
            expect(mockFiles[savedUri]).toBeDefined();
            // Raw file on disk MUST be AES-GCM ciphertext — never cleartext JSON or plaintext!
            expect(mockFiles[savedUri]).not.toContain(secretPlaintext);
            expect(mockFiles[savedUri]).not.toContain("conv-alpha");

            // Simulate cold app restart: clear in-memory decrypt cache & create fresh QueryClient
            clearDecryptCache();
            expect(peekDecrypted(wireCipher)).toBeNull();

            // Wrong user cannot hydrate another user's cache
            const wrongUserClient = new QueryClient();
            await hydrateThreadCache(wrongUserClient, "user-other");
            expect(
                wrongUserClient.getQueryData(queryKeys.conversations())
            ).toBeUndefined();

            // Correct user hydrates both React Query cache and settledCache immediately
            const coldBootClient = new QueryClient();
            await hydrateThreadCache(coldBootClient, "user-1");

            expect(peekDecrypted(wireCipher)).toBe(secretPlaintext);
            const hydratedThread = coldBootClient.getQueryData<{
                pages: ConversationThreadWithMeta[];
            }>(queryKeys.conversation("conv-alpha"));
            expect(hydratedThread?.pages[0].messages[0].plaintext).toBe(
                secretPlaintext
            );

            // Sign-out wipes both hardware key and encrypted file
            await clearThreadCache();
            expect(mockFiles[savedUri]).toBeUndefined();
            expect(
                mockSecureStoreData.circlehub_thread_cache_key_v1
            ).toBeUndefined();
        } finally {
            jest.useRealTimers();
        }
    });

    it("resolves viewport-visible newest 12 messages immediately on Phase 1 while deferring older messages", async () => {
        const messages = Array.from({ length: 20 }, (_, idx) => {
            const body = `Message #${idx + 1}`;
            return makeMessage(
                `m-${idx + 1}`,
                `${ENC_PREFIX}${btoa(body)}`,
                idx % 2 === 0
            );
        });

        mockGetConversation.mockResolvedValueOnce({
            message: "ok",
            data: {
                id: "conv-20",
                otherUser: {
                    id: "user-2",
                    name: "Bob",
                    username: "bob",
                    avatarUrl: null,
                },
                messages,
                hasMore: true,
            },
        });

        const thread = await fetchConversationThread("conv-20", 1, 25, true);

        // Newest 12 messages (indices 8..19) MUST already have plaintext attached on Frame 0
        for (let i = 8; i < 20; i += 1) {
            expect(thread.messages[i].plaintext).toBe(`Message #${i + 1}`);
        }

        // Older 8 messages (indices 0..7) were deferred to Phase 2 background ticks
        expect(thread.messages[0].plaintext).toBeUndefined();

        await waitFor(() => {
            expect(peekDecrypted(thread.messages[0].content)).toBe("Message #1");
        });
    });
});
