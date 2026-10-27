import { gcm } from "@noble/ciphers/aes.js";
import { InfiniteData, QueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { ConversationThreadWithMeta } from "@/lib/messageCacheHelpers";
import { queryKeys } from "@/lib/queryKeys";
import { getRandomBytes } from "@/lib/random";
import {
    concatBytes,
    fromBase64,
    peekDecrypted,
    seedSettledPlaintext,
    toBase64,
} from "@/services/messageCrypto";
import { Conversation, Message } from "@/types/message";

// Hardware-backed AES-256-GCM encrypted disk snapshot of the conversation list and recent page-1
// threads. On Hermes, symmetric AES-256-GCM decryption of an entire 15-thread snapshot takes ~1.5 ms
// total (compared to ~150-300 ms of asymmetric P-256 BigInt ECDH derivations), allowing cold app
// launches to open recent conversations in 0 ms with zero skeleton flash.
//
// Security invariant: the snapshot file is encrypted at rest with AES-256-GCM using a 256-bit key
// held exclusively in hardware-backed `expo-secure-store`. Signing out or session expiry deletes
// both the SecureStore key (immediate cryptographic erasure) and the ciphertext file.

const CACHE_KEY_STORE_NAME = "circlehub_thread_cache_key_v1";
const CACHE_FILE_NAME = "circlehub_msgcache_v1.enc";
const MAX_CACHED_THREADS = 15;
const PERSIST_DEBOUNCE_MS = 1000;

type PersistedThreadEntry = {
    id: string;
    updatedAt: number;
    firstPage: ConversationThreadWithMeta;
};

type PersistedSnapshot = {
    v: 1;
    userId: string;
    savedAt: number;
    conversations: Conversation[] | null;
    conversationsUpdatedAt: number;
    previewPlaintexts: Record<string, string>;
    threads: PersistedThreadEntry[];
};

let memoryCacheKey: Uint8Array | null = null;

function getCacheFileUri(): string | null {
    if (Platform.OS === "web") return null;
    try {
        const dir = FileSystem?.cacheDirectory;
        if (!dir) return null;
        return `${dir}${CACHE_FILE_NAME}`;
    } catch {
        return null;
    }
}

async function getOrCreateCacheKey(): Promise<Uint8Array | null> {
    if (memoryCacheKey) return memoryCacheKey;
    if (Platform.OS === "web") return null;

    try {
        const existing = await SecureStore.getItemAsync(CACHE_KEY_STORE_NAME);
        if (existing) {
            const decoded = fromBase64(existing);
            if (decoded.length === 32) {
                memoryCacheKey = decoded;
                return decoded;
            }
        }

        const fresh = getRandomBytes(32);
        await SecureStore.setItemAsync(CACHE_KEY_STORE_NAME, toBase64(fresh));
        memoryCacheKey = fresh;
        return fresh;
    } catch {
        return null;
    }
}

async function readExistingCacheKey(): Promise<Uint8Array | null> {
    if (memoryCacheKey) return memoryCacheKey;
    if (Platform.OS === "web") return null;

    try {
        const existing = await SecureStore.getItemAsync(CACHE_KEY_STORE_NAME);
        if (!existing) return null;
        const decoded = fromBase64(existing);
        if (decoded.length !== 32) return null;
        memoryCacheKey = decoded;
        return decoded;
    } catch {
        return null;
    }
}

export async function clearThreadCache(): Promise<void> {
    memoryCacheKey = null;
    if (Platform.OS === "web") return;

    await Promise.allSettled([
        SecureStore.deleteItemAsync(CACHE_KEY_STORE_NAME),
        (async () => {
            const uri = getCacheFileUri();
            if (uri && typeof FileSystem?.deleteAsync === "function") {
                await FileSystem.deleteAsync(uri, { idempotent: true });
            }
        })(),
    ]);
}

function cleanMessageForSnapshot(message: Message): Message {
    const settled = message.plaintext ?? peekDecrypted(message.content) ?? undefined;
    const copy: Message = {
        id: message.id,
        content: message.content,
        postId: message.postId,
        post: message.post,
        createdAt: message.createdAt,
        isMine: message.isMine,
        sender: message.sender,
        ...(settled ? { plaintext: settled } : {}),
    };
    return copy;
}

function collectSnapshot(
    queryClient: QueryClient,
    userId: string
): PersistedSnapshot | null {
    const listKey = queryKeys.conversations();
    const listState = queryClient.getQueryState<Conversation[]>(listKey);
    const conversations = Array.isArray(listState?.data) ? listState.data : null;

    const previewPlaintexts: Record<string, string> = {};
    if (conversations) {
        for (const conv of conversations) {
            const content = conv?.lastMessage?.content;
            if (content) {
                const settled = peekDecrypted(content);
                if (settled) {
                    previewPlaintexts[content] = settled;
                }
            }
        }
    }

    const allQueries = queryClient.getQueriesData<
        Conversation[] | InfiniteData<ConversationThreadWithMeta>
    >({
        queryKey: queryKeys.conversations(),
    });

    const threads: PersistedThreadEntry[] = [];
    for (const [key, data] of allQueries) {
        if (!Array.isArray(key) || key.length !== 3) continue;
        if (!data || Array.isArray(data) || !Array.isArray(data.pages)) continue;

        const firstPage = data.pages[0];
        const threadId = String(key[2]);
        if (!threadId || !firstPage) continue;

        const state = queryClient.getQueryState(key);
        threads.push({
            id: threadId,
            updatedAt: state?.dataUpdatedAt || Date.now(),
            firstPage: {
                id: firstPage.id,
                otherUser: firstPage.otherUser,
                hasMore: firstPage.hasMore,
                messages: Array.isArray(firstPage.messages)
                    ? firstPage.messages
                          .filter((m) => !m.pending && !m.failed)
                          .map(cleanMessageForSnapshot)
                    : [],
                _markedReadNewestId: null,
            },
        });
    }

    threads.sort((a, b) => b.updatedAt - a.updatedAt);

    if (!conversations && threads.length === 0) return null;

    return {
        v: 1,
        userId: String(userId),
        savedAt: Date.now(),
        conversations,
        conversationsUpdatedAt: listState?.dataUpdatedAt || Date.now(),
        previewPlaintexts,
        threads: threads.slice(0, MAX_CACHED_THREADS),
    };
}

async function writeEncryptedSnapshot(snapshot: PersistedSnapshot): Promise<void> {
    const uri = getCacheFileUri();
    if (!uri || typeof FileSystem?.writeAsStringAsync !== "function") return;

    const key = await getOrCreateCacheKey();
    if (!key) return;

    try {
        const iv = getRandomBytes(12);
        const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
        const encrypted = gcm(key, iv).encrypt(bytes);
        const packed = toBase64(concatBytes(iv, encrypted));
        await FileSystem.writeAsStringAsync(uri, packed);
    } catch {
        // Disk cache writes are best-effort.
    }
}

export async function hydrateThreadCache(
    queryClient: QueryClient,
    userId: string
): Promise<void> {
    if (!queryClient || !userId) return;

    const uri = getCacheFileUri();
    if (!uri || typeof FileSystem?.readAsStringAsync !== "function") return;

    try {
        if (typeof FileSystem.getInfoAsync === "function") {
            const info = await FileSystem.getInfoAsync(uri);
            if (!info?.exists) return;
        }

        const [packed, key] = await Promise.all([
            FileSystem.readAsStringAsync(uri),
            readExistingCacheKey(),
        ]);

        if (!packed || !key) return;

        const raw = fromBase64(packed);
        if (raw.length <= 28) return;

        const iv = raw.slice(0, 12);
        const ciphertext = raw.slice(12);
        const decryptedBytes = gcm(key, iv).decrypt(ciphertext);
        const snapshot = JSON.parse(
            new TextDecoder().decode(decryptedBytes)
        ) as PersistedSnapshot;

        if (!snapshot || snapshot.v !== 1 || String(snapshot.userId) !== String(userId)) {
            return;
        }

        if (snapshot.previewPlaintexts) {
            for (const [cipher, plain] of Object.entries(snapshot.previewPlaintexts)) {
                seedSettledPlaintext(cipher, plain);
            }
        }

        if (Array.isArray(snapshot.conversations)) {
            const listKey = queryKeys.conversations();
            const current = queryClient.getQueryState(listKey);
            const savedAt = snapshot.conversationsUpdatedAt || snapshot.savedAt || 0;
            if (!current?.dataUpdatedAt || current.dataUpdatedAt < savedAt) {
                queryClient.setQueryData(listKey, snapshot.conversations, {
                    updatedAt: savedAt,
                });
            }
        }

        if (Array.isArray(snapshot.threads)) {
            for (const entry of snapshot.threads) {
                if (!entry?.id || !entry?.firstPage) continue;

                if (Array.isArray(entry.firstPage.messages)) {
                    for (const msg of entry.firstPage.messages) {
                        if (msg.content && msg.plaintext) {
                            seedSettledPlaintext(msg.content, msg.plaintext);
                        }
                    }
                }

                const threadKey = queryKeys.conversation(entry.id);
                const existing = queryClient.getQueryState(threadKey);
                const savedAt = entry.updatedAt || snapshot.savedAt || 0;

                if (!existing?.dataUpdatedAt || existing.dataUpdatedAt < savedAt) {
                    queryClient.setQueryData<InfiniteData<ConversationThreadWithMeta>>(
                        threadKey,
                        {
                            pages: [{ ...entry.firstPage, _markedReadNewestId: null }],
                            pageParams: [1],
                        },
                        { updatedAt: savedAt }
                    );
                }
            }
        }
    } catch {
        // Corrupt or outdated cache file is ignored; fresh network data will replace it.
    }
}

export function attachThreadCachePersistence(
    queryClient: QueryClient,
    userId: string
): () => void {
    const uri = getCacheFileUri();
    if (!queryClient || !userId || !uri) {
        return () => {};
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const flush = () => {
        timer = null;
        if (disposed) return;
        const snapshot = collectSnapshot(queryClient, userId);
        if (snapshot) {
            void writeEncryptedSnapshot(snapshot);
        }
    };

    const scheduleFlush = () => {
        if (disposed || timer !== null) return;
        timer = setTimeout(flush, PERSIST_DEBOUNCE_MS);
    };

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        const key = event?.query?.queryKey;
        if (
            !Array.isArray(key) ||
            key[0] !== "messages" ||
            key[1] !== "conversations"
        ) {
            return;
        }
        if (event.type === "updated" && event.action?.type === "success") {
            scheduleFlush();
        }
    });

    return () => {
        disposed = true;
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
        unsubscribe();
    };
}
