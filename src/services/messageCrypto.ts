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

/**
 * The most devices one message is wrapped for. A wrap costs the sender one ECDH and makes the
 * envelope bigger for everyone, and the device directory only grows — every reinstall mints a new
 * device id — so the list is capped even though the server caps its side of it too.
 */
const MAX_WRAPS = 8;

/**
 * How much of that budget the sender's own devices may take. The sender's current device has to
 * be in it — it must be able to read its own message after a reload — but a user with eight signed-in
 * devices should not squeeze the recipient's copy out of the envelope.
 */
const MAX_OWN_WRAPS = 2;

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
let notifyPending = false;
const cacheListeners = new Set<() => void>();
let memoryKeys: StoredDeviceKey[] | null = null;
let loadKeysPromise: Promise<StoredDeviceKey[]> | null = null;
let memoryDeviceId: string | null = null;
let deviceIdChecked = false;
const decodedSecretCache = new WeakMap<StoredDeviceKey, Uint8Array>();

function notifyDecryptCacheChanged(): void {
    cacheVersion += 1;
    for (const listener of cacheListeners) {
        listener();
    }
}

function scheduleNotifyDecryptCacheChanged(): void {
    if (notifyPending) return;
    notifyPending = true;
    queueMicrotask(() => {
        notifyPending = false;
        notifyDecryptCacheChanged();
    });
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
    } catch (error) {
        console.warn(`[Crypto] Failed to write SecureStore item "${key}":`, error);
    }
}

function getDecodedSecret(record: StoredDeviceKey): Uint8Array | null {
    let bytes = decodedSecretCache.get(record);
    if (!bytes) {
        try {
            bytes = fromBase64(record.secretKeyB64);
            decodedSecretCache.set(record, bytes);
        } catch {
            return null;
        }
    }
    return bytes;
}

async function peekStoredDeviceId(): Promise<string | null> {
    if (memoryDeviceId) return memoryDeviceId;
    if (deviceIdChecked) return null;
    deviceIdChecked = true;
    const stored = await readStorageItem(DEVICE_ID_KEY);
    if (stored) {
        memoryDeviceId = stored;
    }
    return memoryDeviceId;
}

export async function getDeviceId(): Promise<string> {
    if (memoryDeviceId) return memoryDeviceId;

    const stored = await readStorageItem(DEVICE_ID_KEY);
    deviceIdChecked = true;
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
    if (loadKeysPromise) return loadKeysPromise;

    loadKeysPromise = (async () => {
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

        for (const entry of memoryKeys) {
            getDecodedSecret(entry);
        }

        return memoryKeys;
    })().finally(() => {
        loadKeysPromise = null;
    });

    return loadKeysPromise;
}

async function saveStoredKey(record: StoredDeviceKey): Promise<void> {
    getDecodedSecret(record);
    const current = await loadStoredKeys();
    const updated = [
        ...current.filter((entry) => entry.publicKeyB64 !== record.publicKeyB64),
        record,
    ].slice(-4);
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
export const DEVICE_KEY_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedDeviceKeysEntry = {
    keys: DeviceKeyDto[];
    expiresAt: number;
};

type EnsuredDeviceKeyResult = {
    record: StoredDeviceKey;
    published: {
        deviceId: string;
        publicKey: string;
        createdAt?: string;
        lastSeenAt?: string;
    }[];
};

const deviceKeyDirectoryCache = new Map<string, CachedDeviceKeysEntry>();
const deviceKeyInFlight = new Map<string, Promise<DeviceKeyDto[]>>();
let ensuredOwnKeyCache: {
    usernameKey: string;
    deviceId: string;
    result: EnsuredDeviceKeyResult;
    expiresAt: number;
} | null = null;

function normalizeUsernameKey(username?: string | null): string {
    return (username ?? "").trim().toLowerCase();
}

export function clearDeviceKeyCache(username?: string | null): void {
    if (username) {
        const key = normalizeUsernameKey(username);
        if (key) {
            deviceKeyDirectoryCache.delete(key);
            deviceKeyInFlight.delete(key);
            if (ensuredOwnKeyCache?.usernameKey === key) {
                ensuredOwnKeyCache = null;
            }
        }
        return;
    }
    deviceKeyDirectoryCache.clear();
    deviceKeyInFlight.clear();
    ensuredOwnKeyCache = null;
}

async function fetchDeviceKeys(
    username: string,
    options?: { forceRefresh?: boolean }
): Promise<DeviceKeyDto[]> {
    const trimmed = username?.trim();
    if (!trimmed) return [];

    const cacheKey = normalizeUsernameKey(trimmed);
    const now = Date.now();

    if (!options?.forceRefresh) {
        const cached = deviceKeyDirectoryCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.keys;
        }
    }

    const inFlight = deviceKeyInFlight.get(cacheKey);
    if (inFlight && !options?.forceRefresh) {
        return inFlight;
    }

    const promise = (async () => {
        try {
            const response = await getUserDeviceKeys(trimmed);
            const keys = response.data ?? [];
            // Only cache non-empty device key lists so a recipient who publishes their very first E2EE
            // key moments later is upgraded to encrypted delivery immediately on the next send.
            if (keys.length > 0) {
                deviceKeyDirectoryCache.set(cacheKey, {
                    keys,
                    expiresAt: Date.now() + DEVICE_KEY_CACHE_TTL_MS,
                });
            } else {
                deviceKeyDirectoryCache.delete(cacheKey);
            }
            return keys;
        } catch {
            return [];
        }
    })().finally(() => {
        if (deviceKeyInFlight.get(cacheKey) === promise) {
            deviceKeyInFlight.delete(cacheKey);
        }
    });

    deviceKeyInFlight.set(cacheKey, promise);
    return promise;
}

export async function publishKey(
    deviceId: string,
    publicKey: string
): Promise<void> {
    clearDeviceKeyCache();
    await registerDeviceKey(deviceId, publicKey);
    clearDeviceKeyCache();
}

/**
 * Pre-warms the recipient's published device keys (and this device's own key state) when opening a
 * conversation thread so the first and subsequent message sends execute with zero `/api/keys` RTTs.
 */
export function prefetchRecipientDeviceKeys(
    recipientUsername?: string | null
): void {
    const trimmed = recipientUsername?.trim();
    if (trimmed) {
        clearDeviceKeyCache(trimmed);
        fetchDeviceKeys(trimmed).catch(() => undefined);
    }
    ensureDeviceKey().catch(() => undefined);
}

/**
 * How old a device's `lastSeenAt` may get before this device re-publishes to refresh it. Far
 * inside the server's 30-day pruning window, so a device that opens the app at all stays listed.
 */
const LIVENESS_REFRESH_MS = 24 * 60 * 60 * 1000;

export function isLivenessStale(
    key: Pick<DeviceKeyDto, "createdAt"> & { lastSeenAt?: string | null },
    now: number = Date.now()
): boolean {
    const seenAt = Date.parse(key.lastSeenAt ?? key.createdAt ?? "");
    return !Number.isFinite(seenAt) || now - seenAt > LIVENESS_REFRESH_MS;
}

let ensurePromise: Promise<EnsuredDeviceKeyResult> | null = null;

export function ensureDeviceKey(explicitUsername?: string | null) {
    if (
        ensuredOwnKeyCache &&
        ensuredOwnKeyCache.expiresAt > Date.now() &&
        (!explicitUsername ||
            normalizeUsernameKey(explicitUsername) ===
                ensuredOwnKeyCache.usernameKey) &&
        (!memoryDeviceId || memoryDeviceId === ensuredOwnKeyCache.deviceId) &&
        Boolean(
            memoryKeys?.some(
                (entry) =>
                    entry.publicKeyB64 ===
                    ensuredOwnKeyCache?.result.record.publicKeyB64
            )
        )
    ) {
        return Promise.resolve(ensuredOwnKeyCache.result);
    }

    if (!ensurePromise) {
        ensurePromise = runEnsureDeviceKey(explicitUsername).finally(() => {
            ensurePromise = null;
        });
    }
    return ensurePromise;
}

function cacheEnsuredOwnKey(
    username: string,
    deviceId: string,
    result: EnsuredDeviceKeyResult
): EnsuredDeviceKeyResult {
    const usernameKey = normalizeUsernameKey(username);
    const expiresAt = Date.now() + DEVICE_KEY_CACHE_TTL_MS;
    ensuredOwnKeyCache = {
        usernameKey,
        deviceId,
        result,
        expiresAt,
    };
    if (result.published.length > 0) {
        deviceKeyDirectoryCache.set(usernameKey, {
            keys: result.published.map((k) => ({
                deviceId: k.deviceId,
                publicKey: k.publicKey,
                createdAt: k.createdAt ?? new Date().toISOString(),
                lastSeenAt: k.lastSeenAt,
            })),
            expiresAt,
        });
    }
    return result;
}

async function runEnsureDeviceKey(
    explicitUsername?: string | null
): Promise<EnsuredDeviceKeyResult> {
    const username = explicitUsername ?? (await currentUsernameFromToken());
    if (!username) throw new Error("Not signed in");

    const usernameKey = normalizeUsernameKey(username);
    const deviceId = await getDeviceId();
    const stored = await loadStoredKeys();

    if (
        ensuredOwnKeyCache &&
        ensuredOwnKeyCache.expiresAt > Date.now() &&
        ensuredOwnKeyCache.usernameKey === usernameKey &&
        ensuredOwnKeyCache.deviceId === deviceId &&
        stored.some(
            (entry) =>
                entry.publicKeyB64 ===
                ensuredOwnKeyCache?.result.record.publicKeyB64
        )
    ) {
        return ensuredOwnKeyCache.result;
    }

    const published = await fetchDeviceKeys(username);
    const mine = published.find((key) => key.deviceId === deviceId);

    if (mine) {
        const record = stored.find(
            (entry) => entry.publicKeyB64 === mine.publicKey
        );
        if (record) {
            // The server prunes a device key that has not been published for 30 days, and a
            // device whose key is already listed would otherwise never publish again — so a phone
            // used every day would still be pruned a month after it first signed in. Re-publish
            // once the stamp is a day old: one cheap upsert a day keeps an active device alive.
            if (isLivenessStale(mine)) {
                registerDeviceKey(deviceId, record.publicKeyB64).catch(
                    () => undefined
                );
            }
            return cacheEnsuredOwnKey(username, deviceId, {
                record,
                published,
            });
        }

        const fresh = await createAndStoreKey(deviceId);
        await publishKey(deviceId, fresh.publicKeyB64);
        return cacheEnsuredOwnKey(username, deviceId, {
            record: fresh,
            published: [
                ...published.filter((key) => key.deviceId !== deviceId),
                { deviceId, publicKey: fresh.publicKeyB64 },
            ],
        });
    }

    const ours = stored
        .filter((entry) => entry.deviceId === deviceId)
        .sort((a, b) => b.createdAt - a.createdAt);

    if (ours.length > 0) {
        await publishKey(deviceId, ours[0].publicKeyB64);
        return cacheEnsuredOwnKey(username, deviceId, {
            record: ours[0],
            published: [
                ...published,
                { deviceId, publicKey: ours[0].publicKeyB64 },
            ],
        });
    }

    const fresh = await createAndStoreKey(deviceId);
    await publishKey(deviceId, fresh.publicKeyB64);
    return cacheEnsuredOwnKey(username, deviceId, {
        record: fresh,
        published: [
            ...published,
            { deviceId, publicKey: fresh.publicKeyB64 },
        ],
    });
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

/**
 * Picks the devices a message is wrapped for: the sender's own devices first — the current one
 * ahead of the rest, because it must be able to read its own message after a reload — and then the
 * recipient's, most recently seen first. The order is not a hint about recency alone: it is what
 * decides which wrap the recipient's fast path finds first.
 *
 * A directory entry as far as wrap selection is concerned. The timestamps are optional because
 * `ensureDeviceKey` appends the key it has just published locally, before the server has stamped it;
 * such an entry sorts as oldest, which is harmless — the current device is always placed first.
 */
type WrapCandidate = {
    deviceId: string;
    publicKey: string;
    createdAt?: string;
    lastSeenAt?: string;
};

export function selectWrapTargets<T extends WrapCandidate>(
    ownKeys: T[],
    recipientKeys: T[],
    currentDeviceId: string
): T[] {
    const seenAt = (key: T) => {
        const parsed = Date.parse(key.lastSeenAt ?? key.createdAt ?? "");
        return Number.isFinite(parsed) ? parsed : Date.now();
    };
    const byRecency = (a: T, b: T) => seenAt(b) - seenAt(a);

    const own = [...ownKeys].sort(byRecency);
    const ownSelected = [
        ...own.filter((key) => key.deviceId === currentDeviceId),
        ...own.filter((key) => key.deviceId !== currentDeviceId),
    ].slice(0, MAX_OWN_WRAPS);

    const recipient = [...recipientKeys]
        .sort(byRecency)
        .slice(0, MAX_WRAPS - ownSelected.length);

    return [...ownSelected, ...recipient];
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

    const ownKeyPromise = ensureDeviceKey().then(
        (res) => ({ ok: true as const, value: res }),
        (error: unknown) => ({ ok: false as const, error })
    );
    const recipientKeys = await fetchDeviceKeys(recipientUsername);
    if (recipientKeys.length === 0) return plaintext;

    const ownOutcome = await ownKeyPromise;
    if (!ownOutcome.ok) {
        throw ownOutcome.error;
    }
    const { published: ownKeys } = ownOutcome.value;

    // Dedupe: a user messaging themselves (or the same key listed twice) must not get two wraps.
    const currentDeviceId = await getDeviceId();
    const targets = new Map<string, { deviceId: string; publicKey: string }>();
    for (const key of selectWrapTargets(
        ownKeys,
        recipientKeys,
        currentDeviceId
    )) {
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

/**
 * Opens one wrap with a derived wrap key. Returns the plaintext, or null when the pair does not
 * authenticate. The AEAD tag is the only thing that proves a key is the right one, so a failure
 * here is a "keep trying", never a hard error.
 */
function openWrap(
    wrapKey: Uint8Array,
    wrap: { d: string; k: string },
    contentIv: Uint8Array,
    ciphertext: Uint8Array
): string | null {
    try {
        const packed = fromBase64(wrap.k);
        const wrapIv = packed.slice(0, 12);
        const wrappedKey = packed.slice(12);
        const contentKey = gcm(wrapKey, wrapIv).decrypt(wrappedKey);
        const plaintextBytes = gcm(contentKey, contentIv).decrypt(ciphertext);
        return new TextDecoder().decode(plaintextBytes);
    } catch {
        return null;
    }
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

    let [keys, activeDeviceId] = await Promise.all([
        loadStoredKeys(),
        peekStoredDeviceId(),
    ]);

    if (keys.length === 0) {
        try {
            await ensureDeviceKey();
            keys = await loadStoredKeys();
            activeDeviceId = await peekStoredDeviceId();
        } catch {
            // ignore
        }
    }

    const orderedKeys = activeDeviceId
        ? [
              ...keys
                  .filter((k) => k.deviceId === activeDeviceId)
                  .reverse(),
              ...keys.filter((k) => k.deviceId !== activeDeviceId),
          ]
        : keys;

    const candidates: {
        deviceId: string;
        secretKey: Uint8Array;
        wrapKey?: Uint8Array | null;
    }[] = [];
    for (const record of orderedKeys) {
        const secretKey = getDecodedSecret(record);
        if (secretKey) {
            candidates.push({
                deviceId: record.deviceId,
                secretKey,
            });
        }
    }

    // The wrap key depends only on our secret key and the sender's ephemeral public key — never on
    // which wrap is being opened — so it is derived once per local key and reused for every wrap.
    // Deriving it per (key, wrap) pair made the fallback sweep quadratic: a seven-wrap envelope
    // against a three-key ring paid twenty-one ECDHs where three were needed, and one ECDH is
    // ~2 ms of BigInt arithmetic on Hermes.
    function wrapKeyFor(index: number): Uint8Array | null {
        const candidate = candidates[index];
        if (candidate.wrapKey === undefined) {
            try {
                candidate.wrapKey = deriveWrapKey(
                    candidate.secretKey,
                    ephemeralPublicKey
                );
            } catch {
                candidate.wrapKey = null;
            }
        }
        return candidate.wrapKey;
    }

    // Every wrap names the device it belongs to (`w[].d`), so try the wraps whose device id we
    // actually hold a key for before falling back to the sweep below. Within a non-active device
    // bucket, newer keys are placed ahead of older rotated keys.
    const byDeviceId = new Map<string, number[]>();
    for (let index = 0; index < candidates.length; index += 1) {
        const deviceId = candidates[index].deviceId;
        const bucket = byDeviceId.get(deviceId);
        if (bucket) {
            if (deviceId === activeDeviceId) {
                bucket.push(index);
            } else {
                bucket.unshift(index);
            }
        } else {
            byDeviceId.set(deviceId, [index]);
        }
    }

    for (const wrap of envelope.w) {
        const bucket = byDeviceId.get(wrap.d);
        if (!bucket) continue;

        for (const index of bucket) {
            const wrapKey = wrapKeyFor(index);
            if (!wrapKey) continue;
            const plaintext = openWrap(
                wrapKey,
                wrap,
                contentIv,
                ciphertext
            );
            if (plaintext !== null) return plaintext;
        }
    }

    // Fallback: the device id is a hint, not a proof. A key restored from the recovery phrase
    // lives under the *current* device id while the message was wrapped for the id the old install
    // used, and a device that rotated its key keeps its id with a different key — neither is
    // reachable by the id alone, so the sweep still runs and the AEAD tag stays the only real check.
    for (let index = 0; index < candidates.length; index += 1) {
        const wrapKey = wrapKeyFor(index);
        if (!wrapKey) continue;
        for (const wrap of envelope.w) {
            const plaintext = openWrap(wrapKey, wrap, contentIv, ciphertext);
            if (plaintext !== null) return plaintext;
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
    try {
        return await decryptEnvelope(envelope);
    } catch {
        return UNREADABLE_PLACEHOLDER;
    }
}

export function decryptMessageContent(
    content?: string | null
): Promise<string> {
    if (!isEncryptedContent(content)) {
        return Promise.resolve(content ?? "");
    }

    const cached = decryptCache.get(content);
    if (cached) return cached;

    const promise = decryptFresh(content)
        .catch(() => UNREADABLE_PLACEHOLDER)
        .then((text) => {
            settledCache.set(content, text);
            if (decryptCache.size > DECRYPT_CACHE_LIMIT) {
                const oldest = decryptCache.keys().next().value;
                if (oldest) {
                    decryptCache.delete(oldest);
                    settledCache.delete(oldest);
                }
            }
            scheduleNotifyDecryptCacheChanged();
            return text;
        });

    decryptCache.set(content, promise);
    return promise;
}

export function seedSettledPlaintext(
    content?: string | null,
    plaintext?: string | null
): void {
    if (!isEncryptedContent(content) || !plaintext || plaintext === UNREADABLE_PLACEHOLDER) return;
    if (settledCache.has(content)) return;

    settledCache.set(content, plaintext);
    decryptCache.set(content, Promise.resolve(plaintext));
    if (decryptCache.size > DECRYPT_CACHE_LIMIT) {
        const oldest = decryptCache.keys().next().value;
        if (oldest) {
            decryptCache.delete(oldest);
            settledCache.delete(oldest);
        }
    }
}

export function peekDecrypted(content?: string | null): string | null {
    if (!content) return null;
    return settledCache.get(content) ?? null;
}

export function clearDecryptCache(): void {
    decryptCache.clear();
    settledCache.clear();
    clearDeviceKeyCache();
    notifyDecryptCacheChanged();
}