import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

import {
    deleteKeyBackup,
    getKeyBackup,
    KeyBackupDto,
    saveKeyBackup,
} from "@/api/keys";
import { ApiError } from "@/types/api";
import { BIP39_WORDS } from "./bip39Words";
import {
    clearDecryptCache,
    concatBytes,
    createRecoverableDeviceKey,
    fromBase64,
    getDeviceId,
    importDeviceKey,
    publishKey,
    randomBytes,
    toBase64,
} from "./messageCrypto";

const PHRASE_WORD_COUNT = 12;
const PHRASE_ENTROPY_BYTES = 16;
const PHRASE_CHECKSUM_BITS = 4;

const KDF_ALGORITHM = "PBKDF2-HMAC-SHA-256";
export const KDF_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const ACCOUNT_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;

export function normalisePhrase(input: string): string {
    return String(input ?? "")
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join(" ");
}

export function isWellFormedPhrase(input: string): boolean {
    const words = normalisePhrase(input).split(" ").filter(Boolean);
    if (words.length !== PHRASE_WORD_COUNT) return false;
    return words.every((word) => BIP39_WORDS.includes(word));
}

export function generatePhrase(): string {
    const entropy = randomBytes(PHRASE_ENTROPY_BYTES);
    const checksum = sha256(entropy);

    let bits = "";
    for (const byte of entropy) bits += byte.toString(2).padStart(8, "0");
    bits += checksum[0]
        .toString(2)
        .padStart(8, "0")
        .slice(0, PHRASE_CHECKSUM_BITS);

    const words: string[] = [];
    for (let i = 0; i < PHRASE_WORD_COUNT; i += 1) {
        words.push(BIP39_WORDS[parseInt(bits.slice(i * 11, i * 11 + 11), 2)]);
    }
    return words.join(" ");
}

export function hasValidChecksum(input: string): boolean {
    const words = normalisePhrase(input).split(" ").filter(Boolean);
    if (words.length !== PHRASE_WORD_COUNT) return false;

    const indices = words.map((word) => BIP39_WORDS.indexOf(word));
    if (indices.some((index) => index < 0)) return false;

    let bits = "";
    for (const index of indices) bits += index.toString(2).padStart(11, "0");

    const entropyBits = bits.slice(0, PHRASE_ENTROPY_BYTES * 8);
    const checksumBits = bits.slice(PHRASE_ENTROPY_BYTES * 8);

    const entropy = new Uint8Array(PHRASE_ENTROPY_BYTES);
    for (let i = 0; i < PHRASE_ENTROPY_BYTES; i += 1) {
        entropy[i] = parseInt(entropyBits.slice(i * 8, i * 8 + 8), 2);
    }

    const digest = sha256(entropy);
    const expected = digest[0]
        .toString(2)
        .padStart(8, "0")
        .slice(0, PHRASE_CHECKSUM_BITS);
    return expected === checksumBits;
}

async function derivePhraseKey(
    phrase: string,
    salt: Uint8Array,
    iterations: number
): Promise<Uint8Array> {
    const passwordBytes = new TextEncoder().encode(normalisePhrase(phrase));
    await new Promise((resolve) => setTimeout(resolve, 30));
    return pbkdf2(sha256, passwordBytes, salt, {
        c: iterations,
        dkLen: 32,
    });
}

function seal(key: Uint8Array, plaintextBytes: Uint8Array): string {
    const iv = randomBytes(GCM_IV_BYTES);
    const sealed = gcm(key, iv).encrypt(plaintextBytes);
    return toBase64(concatBytes(iv, sealed));
}

function open(key: Uint8Array, packedB64: string): Uint8Array | null {
    try {
        const packed = fromBase64(packedB64);
        const iv = packed.slice(0, GCM_IV_BYTES);
        const ciphertext = packed.slice(GCM_IV_BYTES);
        return gcm(key, iv).decrypt(ciphertext);
    } catch {
        return null;
    }
}

export async function getBackupInfo(): Promise<KeyBackupDto | null> {
    try {
        const response = await getKeyBackup();
        return response.data ?? null;
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}

export async function removeBackup(): Promise<void> {
    await deleteKeyBackup();
}

export async function initializeRecovery(): Promise<{
    phrase: string;
    accountKey: Uint8Array;
}> {
    const deviceId = await getDeviceId();
    const { record, secretKeyBytes } = await createRecoverableDeviceKey(
        deviceId
    );
    await publishKey(deviceId, record.publicKeyB64);

    const phrase = generatePhrase();
    const salt = randomBytes(SALT_BYTES);
    const phraseKey = await derivePhraseKey(phrase, salt, KDF_ITERATIONS);
    const portableKey = concatBytes(
        secretKeyBytes,
        fromBase64(record.publicKeyB64)
    );
    const wrappedAccountKey = seal(phraseKey, portableKey);

    await saveKeyBackup({
        wrappedAccountKey,
        salt: toBase64(salt),
        kdfIterations: KDF_ITERATIONS,
        kdfAlgorithm: KDF_ALGORITHM,
    });

    clearDecryptCache();
    return { phrase, accountKey: portableKey };
}

export async function restoreRecovery(phrase: string): Promise<{
    accountKey: Uint8Array;
}> {
    const backup = await getBackupInfo();
    if (!backup) {
        throw new Error("This account has no recovery set up");
    }

    if (!isWellFormedPhrase(phrase)) {
        throw new Error(`A recovery phrase is ${PHRASE_WORD_COUNT} words`);
    }

    const phraseKey = await derivePhraseKey(
        phrase,
        fromBase64(backup.salt),
        backup.kdfIterations
    );
    const accountKey = open(phraseKey, backup.wrappedAccountKey);
    if (!accountKey || accountKey.length < ACCOUNT_KEY_BYTES) {
        throw new Error("That recovery phrase does not match this account");
    }

    const deviceId = await getDeviceId();
    const secretKeyBytes = accountKey.slice(0, ACCOUNT_KEY_BYTES);
    const publicKeyBytes =
        accountKey.length === 97 ? accountKey.slice(32, 97) : undefined;
    const record = await importDeviceKey(
        deviceId,
        secretKeyBytes,
        publicKeyBytes
    );
    await publishKey(deviceId, record.publicKeyB64);
    clearDecryptCache();

    return { accountKey };
}
