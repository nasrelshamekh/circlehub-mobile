import { gcm } from "@noble/ciphers/aes.js";
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
    DeviceKeyDto,
    getUserDeviceKeys,
    registerDeviceKey,
} from "@/api/keys";
import { getRandomBytes, randomUUID } from "@/lib/random";
import { getToken } from "@/lib/session";

export const ENC_PREFIX = "ENC:v1:";
export const MAX_PLAINTEXT_LENGTH = 4000;
export const UNREADABLE_PLACEHOLDER = "[Can't decrypt this message]";

const DEVICE_ID_KEY = "circlehub_device_id";
const PRIVATE_KEYS_KEY = "circlehub_private_keys_v1";
const HKDF_INFO = new TextEncoder().encode("CircleHub v1 message key wrap");
const EMPTY_SALT = new Uint8Array(0);
const DECRYPT_CACHE_LIMIT = 1000;

export type StoredDeviceKey = {
    localId: string;
    deviceId: string;
    publicKeyB64: string;
    secretKeyB64: string;
    createdAt: number;
};

type EncryptedEnvelope = {
    v: number;
    alg: string;
    e: string;
    iv: string;
    ct: string;
    w: { d: string; k: string }[];
};

const decryptCache = new Map<string, Promise<string>>();
const settledCache = new Map<string, string>();
let cacheVersion = 0;
const cacheListeners = new Set<() => void>();
let memoryKeys: StoredDeviceKey[] | null = null;
let memoryDeviceId: string | null = null;

function notifyDecryptCacheChanged(): void {
    cacheVersion += 1;
    for (const listener of cacheListeners) {
        listener();
    }
}

export function subscribeDecryptCache(listener: () => void): () => void {
    cacheListeners.add(listener);
    return () => {
        cacheListeners.delete(listener);
    };
}

export function getDecryptCacheVersion(): number {
    return cacheVersion;
}

export function toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
}

export function randomBytes(length: number): Uint8Array {
    return getRandomBytes(length);
}

function randomUuid(): string {
    return randomUUID();
}

async function readStorageItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
    try {
        return await SecureStore.getItemAsync(key);
    } catch {
        return null;
    }
}

async function writeStorageItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
        try {
            localStorage.setItem(key, value);
        } catch {
            // ignore
        }
        return;
    }
    try {
        await SecureStore.setItemAsync(key, value);
    } catch {
        // ignore
    }
}

export async function getDeviceId(): Promise<string> {
    if (memoryDeviceId) return memoryDeviceId;

    const stored = await readStorageItem(DEVICE_ID_KEY);
    if (stored) {
        memoryDeviceId = stored;
        return stored;
    }

    const generated = randomUuid();
    memoryDeviceId = generated;
    await writeStorageItem(DEVICE_ID_KEY, generated);
    return generated;
}

async function loadStoredKeys(): Promise<StoredDeviceKey[]> {
    if (memoryKeys) return memoryKeys;

    const raw = await readStorageItem(PRIVATE_KEYS_KEY);
    if (!raw) {
        memoryKeys = [];
        return memoryKeys;
    }

    try {
        const parsed = JSON.parse(raw);
        memoryKeys = Array.isArray(parsed) ? parsed : [];
    } catch {
        memoryKeys = [];
    }
    return memoryKeys;
}

async function saveStoredKey(record: StoredDeviceKey): Promise<void> {
    const current = await loadStoredKeys();
    const updated = [
        ...current.filter((entry) => entry.publicKeyB64 !== record.publicKeyB64),
        record,
    ].slice(-8);
    memoryKeys = updated;
    await writeStorageItem(PRIVATE_KEYS_KEY, JSON.stringify(updated));
    clearDecryptCache();
}

async function currentUsernameFromToken(): Promise<string | null> {
    try {
        const token = await getToken();
        if (!token) return null;
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
        const claims = JSON.parse(atob(padded));
        return claims.unique_name ?? null;
    } catch {
        return null;
    }
}

async function createAndStoreKey(deviceId: string): Promise<StoredDeviceKey> {
    const secretKey = randomBytes(32);
    const publicKey = p256.getPublicKey(secretKey, false);
    const record: StoredDeviceKey = {
        localId: randomUuid(),
        deviceId,
        publicKeyB64: toBase64(publicKey),
        secretKeyB64: toBase64(secretKey),
        createdAt: Date.now(),
    };
    await saveStoredKey(record);
    return record;
}

export async function createRecoverableDeviceKey(
    deviceId: string
): Promise<{ record: StoredDeviceKey; secretKeyBytes: Uint8Array }> {
    const stored = await loadStoredKeys();
    const existing = [...stored]
        .reverse()
        .find((entry) => entry.deviceId === deviceId);
    const record = existing ?? (await createAndStoreKey(deviceId));
    return {
        record,
        secretKeyBytes: fromBase64(record.secretKeyB64),
    };
}

export async function importDeviceKey(
    deviceId: string,
    secretKeyBytes: Uint8Array,
    publicKeyBytes?: Uint8Array
): Promise<StoredDeviceKey> {
    const pub =
        publicKeyBytes && publicKeyBytes.length === 65
            ? publicKeyBytes
            : p256.getPublicKey(secretKeyBytes, false);
    const record: StoredDeviceKey = {
        localId: randomUuid(),
        deviceId,
        publicKeyB64: toBase64(pub),
        secretKeyB64: toBase64(secretKeyBytes),
        createdAt: Date.now(),
    };
    await saveStoredKey(record);
    return record;
}

// A successful fetch that returns no keys means the recipient has never published any, which is a
// legitimate reason to fall back to plaintext. A *failed* fetch means we don't know whether they
// have keys, so it must throw: silently returning [] here would downgrade an E2EE message to
// plaintext because of a transient network error.
async function fetchDeviceKeys(username: string): Promise<DeviceKeyDto[]> {
    if (!username) return [];
    const response = await getUserDeviceKeys(username);
    return response.data ?? [];
}

export async function publishKey(
    deviceId: string,
    publicKey: string
): Promise<void> {
    await registerDeviceKey(deviceId, publicKey);
}

let ensurePromise: Promise<{
    record: StoredDeviceKey;
    published: { deviceId: string; publicKey: string }[];
}> | null = null;

export function ensureDeviceKey(explicitUsername?: string | null) {
    if (!ensurePromise) {
        ensurePromise = runEnsureDeviceKey(explicitUsername).finally(() => {
            ensurePromise = null;
        });
    }
    return ensurePromise;
}

async function runEnsureDeviceKey(explicitUsername?: string | null) {
    const username = explicitUsername ?? (await currentUsernameFromToken());
    if (!username) throw new Error("Not signed in");

    const deviceId = await getDeviceId();
    const stored = await loadStoredKeys();
    const published = await fetchDeviceKeys(username);
    const mine = published.find((key) => key.deviceId === deviceId);

    if (mine) {
        const record = stored.find(
            (entry) => entry.publicKeyB64 === mine.publicKey
        );
        if (record) return { record, published };

        const fresh = await createAndStoreKey(deviceId);
        await publishKey(deviceId, fresh.publicKeyB64);
        return {
            record: fresh,
            published: [
                ...published.filter((key) => key.deviceId !== deviceId),
                { deviceId, publicKey: fresh.publicKeyB64 },
            ],
        };
    }

    const ours = stored
        .filter((entry) => entry.deviceId === deviceId)
        .sort((a, b) => b.createdAt - a.createdAt);

    if (ours.length > 0) {
        await publishKey(deviceId, ours[0].publicKeyB64);
        return {
            record: ours[0],
            published: [
                ...published,
                { deviceId, publicKey: ours[0].publicKeyB64 },
            ],
        };
    }

    const fresh = await createAndStoreKey(deviceId);
    await publishKey(deviceId, fresh.publicKeyB64);
    return {
        record: fresh,
        published: [
            ...published,
            { deviceId, publicKey: fresh.publicKeyB64 },
        ],
    };
}

function deriveWrapKey(
    secretKeyBytes: Uint8Array,
    peerPublicKeyBytes: Uint8Array
): Uint8Array {
    const sharedPoint = p256.getSharedSecret(
        secretKeyBytes,
        peerPublicKeyBytes,
        false
    );
    const sharedX = sharedPoint.slice(1, 33);
    return hkdf(sha256, sharedX, EMPTY_SALT, HKDF_INFO, 32);
}

export function isEncryptedContent(
    content?: string | null
): content is string {
    return typeof content === "string" && content.startsWith(ENC_PREFIX);
}

export async function encryptMessageContent({
    recipientUsername,
    plaintext,
}: {
    recipientUsername: string;
    plaintext: string;
}): Promise<string> {
    if (!plaintext) return plaintext;

    if (plaintext.length > MAX_PLAINTEXT_LENGTH) {
        throw new Error(
            `Messages can be at most ${MAX_PLAINTEXT_LENGTH} characters`
        );
    }

    const recipientKeys = await fetchDeviceKeys(recipientUsername);
    if (recipientKeys.length === 0) return plaintext;

    const { published: ownKeys } = await ensureDeviceKey();

    const targets = new Map<string, { deviceId: string; publicKey: string }>();
    for (const key of [...ownKeys, ...recipientKeys]) {
        targets.set(`${key.deviceId}|${key.publicKey}`, key);
    }

    const contentKey = randomBytes(32);
    const iv = randomBytes(12);
    const ciphertext = gcm(contentKey, iv).encrypt(
        new TextEncoder().encode(plaintext)
    );

    const ephemeralSecret = randomBytes(32);
    const ephemeralPublic = p256.getPublicKey(ephemeralSecret, false);
    const ephemeralB64 = toBase64(ephemeralPublic);

    const wraps: { d: string; k: string }[] = [];
    for (const target of targets.values()) {
        const peerPublic = fromBase64(target.publicKey);
        const wrapKey = deriveWrapKey(ephemeralSecret, peerPublic);
        const wrapIv = randomBytes(12);
        const wrapped = gcm(wrapKey, wrapIv).encrypt(contentKey);
        wraps.push({
            d: target.deviceId,
            k: toBase64(concatBytes(wrapIv, wrapped)),
        });
    }

    const envelope: EncryptedEnvelope = {
        v: 1,
        alg: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
        e: ephemeralB64,
        iv: toBase64(iv),
        ct: toBase64(ciphertext),
        w: wraps,
    };

    const packed =
        ENC_PREFIX +
        toBase64(new TextEncoder().encode(JSON.stringify(envelope)));
    settledCache.set(packed, plaintext);
    return packed;
}

async function decryptEnvelope(envelope: EncryptedEnvelope): Promise<string> {
    if (
        !envelope ||
        envelope.v !== 1 ||
        !envelope.e ||
        !Array.isArray(envelope.w)
    ) {
        return UNREADABLE_PLACEHOLDER;
    }

    let ephemeralPublicKey: Uint8Array;
    let contentIv: Uint8Array;
    let ciphertext: Uint8Array;
    try {
        ephemeralPublicKey = fromBase64(envelope.e);
        contentIv = fromBase64(envelope.iv);
        ciphertext = fromBase64(envelope.ct);
    } catch {
        return UNREADABLE_PLACEHOLDER;
    }

    const keys = await loadStoredKeys();

    for (const record of keys) {
        let secretKey: Uint8Array;
        try {
            secretKey = fromBase64(record.secretKeyB64);
        } catch {
            continue;
        }

        for (const wrap of envelope.w) {
            try {
                const wrapKey = deriveWrapKey(secretKey, ephemeralPublicKey);
                const packed = fromBase64(wrap.k);
                const wrapIv = packed.slice(0, 12);
                const wrappedKey = packed.slice(12);
                const contentKey = gcm(wrapKey, wrapIv).decrypt(wrappedKey);
                const plaintextBytes = gcm(contentKey, contentIv).decrypt(
                    ciphertext
                );
                return new TextDecoder().decode(plaintextBytes);
            } catch {
                // Wrong key for this wrap — try the next.
            }
        }
    }

    return UNREADABLE_PLACEHOLDER;
}

function legacyDecode(content: string): string {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(
            fromBase64(content.slice(ENC_PREFIX.length))
        );
    } catch {
        return UNREADABLE_PLACEHOLDER;
    }
}

async function decryptFresh(content: string): Promise<string> {
    let envelope: EncryptedEnvelope;
    try {
        const json = new TextDecoder().decode(
            fromBase64(content.slice(ENC_PREFIX.length))
        );
        envelope = JSON.parse(json) as EncryptedEnvelope;
    } catch {
        return legacyDecode(content);
    }
    return decryptEnvelope(envelope);
}

export function decryptMessageContent(
    content?: string | null
): Promise<string> {
    if (!isEncryptedContent(content)) {
        return Promise.resolve(content ?? "");
    }

    const cached = decryptCache.get(content);
    if (cached) return cached;

    const promise = decryptFresh(content).then((text) => {
        if (text === UNREADABLE_PLACEHOLDER) {
            decryptCache.delete(content);
            return text;
        }
        settledCache.set(content, text);
        if (decryptCache.size > DECRYPT_CACHE_LIMIT) {
            const oldest = decryptCache.keys().next().value;
            if (oldest) {
                decryptCache.delete(oldest);
                settledCache.delete(oldest);
            }
        }
        return text;
    });

    decryptCache.set(content, promise);
    return promise;
}

export function peekDecrypted(content?: string | null): string | null {
    if (!content) return null;
    return settledCache.get(content) ?? null;
}

export function clearDecryptCache(): void {
    decryptCache.clear();
    settledCache.clear();
    notifyDecryptCacheChanged();
}
