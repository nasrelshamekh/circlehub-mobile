import { gcm } from "@noble/ciphers/aes.js";
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

// `p256` is frozen, so the ECDH counter cannot be a spy on the curve object. The module is
// replaced with a thin wrapper that counts `getSharedSecret` calls and delegates to the real one.
const mockSharedSecretCalls = { count: 0 };

jest.mock("@noble/curves/nist.js", () => {
    const actual = jest.requireActual("@noble/curves/nist.js");
    return {
        ...actual,
        p256: {
            ...actual.p256,
            getSharedSecret: (...args: Parameters<typeof actual.p256.getSharedSecret>) => {
                mockSharedSecretCalls.count += 1;
                return actual.p256.getSharedSecret(...args);
            },
        },
    };
});

const mockSecureStore: Record<string, string> = {};

jest.mock("expo-secure-store", () => ({
    getItemAsync: jest.fn(async (key: string) => mockSecureStore[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
        mockSecureStore[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
        delete mockSecureStore[key];
    }),
}));

jest.mock("expo-crypto", () => ({
    getRandomBytes: jest.fn((size: number) => {
        const out = new Uint8Array(size);
        for (let i = 0; i < size; i += 1) {
            out[i] = (i * 37 + 13) & 0xff;
        }
        return out;
    }),
    randomUUID: jest.fn(() => "11111111-2222-4333-8444-555555555555"),
}));

jest.mock("@/api/keys", () => ({
    getUserDeviceKeys: jest.fn(async () => ({
        success: true,
        count: 0,
        data: [],
    })),
    registerDeviceKey: jest.fn(async () => ({
        success: true,
        data: null,
    })),
    getKeyBackup: jest.fn(async () => ({ success: true, data: null })),
    saveKeyBackup: jest.fn(async () => ({ success: true, data: null })),
    deleteKeyBackup: jest.fn(async () => ({ success: true, message: "Removed" })),
}));

jest.mock("@/lib/session", () => ({
    getToken: jest.fn(async () => {
        const payload = btoa(JSON.stringify({ unique_name: "alice" }));
        return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
    }),
}));

type MessageCrypto = typeof import("@/services/messageCrypto");

const EMPTY_SALT = new Uint8Array(0);
const HKDF_INFO = new TextEncoder().encode("CircleHub v1 message key wrap");

/**
 * A distinct secret per seed. `expo-crypto` is mocked with a deterministic byte pattern, so every
 * `randomBytes(32)` call would otherwise hand back the *same* key and a test could not tell two
 * different devices apart.
 */
function secretFor(seed: number): Uint8Array {
    const out = new Uint8Array(32);
    for (let i = 0; i < out.length; i += 1) {
        out[i] = (i * 31 + seed * 17 + 7) & 0xff;
    }
    return out;
}

/**
 * Builds an `ENC:v1:` envelope exactly the way `encryptMessageContent` does, but with the wrap list
 * under the test's control so the decrypt path can be driven into a known shape.
 */
function buildEnvelope(
    crypto: MessageCrypto,
    plaintext: string,
    targets: { deviceId: string; secretKey: Uint8Array }[]
): string {
    const contentKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const ciphertext = gcm(contentKey, iv).encrypt(
        new TextEncoder().encode(plaintext)
    );
    const ephemeralSecret = crypto.randomBytes(32);
    const ephemeralPublic = p256.getPublicKey(ephemeralSecret, false);
    const wraps = targets.map(({ deviceId, secretKey }) => {
        const peerPublic = p256.getPublicKey(secretKey, false);
        const shared = p256.getSharedSecret(ephemeralSecret, peerPublic, false);
        const wrapKey = hkdf(
            sha256,
            shared.slice(1, 33),
            EMPTY_SALT,
            HKDF_INFO,
            32
        );
        const wrapIv = crypto.randomBytes(12);
        const wrapped = gcm(wrapKey, wrapIv).encrypt(contentKey);
        return {
            d: deviceId,
            k: crypto.toBase64(crypto.concatBytes(wrapIv, wrapped)),
        };
    });

    const envelope = {
        v: 1,
        alg: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
        e: crypto.toBase64(ephemeralPublic),
        iv: crypto.toBase64(iv),
        ct: crypto.toBase64(ciphertext),
        w: wraps,
    };

    return (
        crypto.ENC_PREFIX +
        crypto.toBase64(new TextEncoder().encode(JSON.stringify(envelope)))
    );
}

describe("mobile E2EE decrypt: the device-id fast path", () => {
    // The module keeps its keyring in a module-level cache, so a fresh instance per test is what
    // makes "a keyring of exactly two devices" mean anything.
    let crypto: MessageCrypto;

    beforeEach(() => {
        // `jest.isolateModules` gives the test its own module registry, so the keyring cache the
        // module keeps in memory starts empty — "a keyring of exactly two devices" then means
        // something.
        let loaded: MessageCrypto | undefined;
        jest.isolateModules(() => {
            loaded = require("@/services/messageCrypto") as MessageCrypto;
        });
        crypto = loaded!;

        for (const key of Object.keys(mockSecureStore)) {
            delete mockSecureStore[key];
        }
        mockSharedSecretCalls.count = 0;
    });

    it("opens the wrap that names a device in the local keyring without sweeping every pair", async () => {
        const ownerSecret = secretFor(31);
        const strangerSecret = secretFor(32);

        // The keyring holds exactly one device, and the wrap that belongs to it sits *behind* a
        // wrap this device cannot open — so a blind sweep would need two ECDHs, not one.
        await crypto.importDeviceKey(
            "dev-owner",
            ownerSecret,
            p256.getPublicKey(ownerSecret, false)
        );

        const ciphertext = buildEnvelope(crypto, "fast path wins", [
            { deviceId: "dev-stranger", secretKey: strangerSecret },
            { deviceId: "dev-owner", secretKey: ownerSecret },
        ]);

        mockSharedSecretCalls.count = 0;

        await expect(crypto.decryptMessageContent(ciphertext)).resolves.toBe(
            "fast path wins"
        );
        expect(mockSharedSecretCalls.count).toBe(1);
    });

    it("still opens the envelope when the wrap names a device this install has no id for", async () => {
        const ownerSecret = secretFor(41);

        // A key restored from the recovery phrase lives under the *current* device id while the
        // message was wrapped for the id the old install used, so the id hint misses and the
        // fallback sweep is the only way through.
        await crypto.importDeviceKey(
            "dev-restored",
            ownerSecret,
            p256.getPublicKey(ownerSecret, false)
        );

        const ciphertext = buildEnvelope(crypto, "fallback still opens", [
            { deviceId: "dev-old-install", secretKey: ownerSecret },
        ]);

        await expect(crypto.decryptMessageContent(ciphertext)).resolves.toBe(
            "fallback still opens"
        );
    });

    it("opens a wrap whose device kept its id but rotated its key", async () => {
        const oldSecret = secretFor(21);
        const newSecret = secretFor(22);

        // Same device id, two keys: the ring holds the stale one first and the current one second,
        // and the envelope was wrapped for the current one.
        await crypto.importDeviceKey(
            "dev-rotated",
            oldSecret,
            p256.getPublicKey(oldSecret, false)
        );
        await crypto.importDeviceKey(
            "dev-rotated",
            newSecret,
            p256.getPublicKey(newSecret, false)
        );

        const ciphertext = buildEnvelope(crypto, "rotated key opens", [
            { deviceId: "dev-rotated", secretKey: newSecret },
        ]);

        await expect(crypto.decryptMessageContent(ciphertext)).resolves.toBe(
            "rotated key opens"
        );
    });

    it("returns the unreadable placeholder for an envelope no local key can open", async () => {
        const mineSecret = secretFor(51);
        await crypto.importDeviceKey(
            "dev-mine",
            mineSecret,
            p256.getPublicKey(mineSecret, false)
        );

        const ciphertext = buildEnvelope(crypto, "not for me", [
            { deviceId: "dev-theirs", secretKey: secretFor(52) },
        ]);

        await expect(crypto.decryptMessageContent(ciphertext)).resolves.toBe(
            crypto.UNREADABLE_PLACEHOLDER
        );
    });

    it("derives one wrap key per local key, not one per key and wrap pair", async () => {
        // The wrap key depends only on our secret key and the sender's ephemeral public key, so a
        // sweep over two local keys and four wraps costs two ECDHs — not eight. One ECDH is ~2 ms of
        // BigInt arithmetic on Hermes, and the sweep runs inside one synchronous block, so the
        // difference is the difference between a thread that opens and a thread that freezes.
        const firstSecret = secretFor(1);
        const secondSecret = secretFor(2);

        await crypto.importDeviceKey(
            "dev-first",
            firstSecret,
            p256.getPublicKey(firstSecret, false)
        );
        await crypto.importDeviceKey(
            "dev-second",
            secondSecret,
            p256.getPublicKey(secondSecret, false)
        );

        // No wrap names a device this install has an id for, so the id hint misses and the sweep is
        // the only way through. The wrap that opens is the last one and it belongs to the *second*
        // key, so both keys have to be tried.
        const ciphertext = buildEnvelope(crypto, "one wrap key per key", [
            { deviceId: "dev-stranger-1", secretKey: secretFor(11) },
            { deviceId: "dev-stranger-2", secretKey: secretFor(12) },
            { deviceId: "dev-stranger-3", secretKey: secretFor(13) },
            { deviceId: "dev-old-install", secretKey: secondSecret },
        ]);

        mockSharedSecretCalls.count = 0;

        await expect(crypto.decryptMessageContent(ciphertext)).resolves.toBe(
            "one wrap key per key"
        );
        expect(mockSharedSecretCalls.count).toBe(2);
    });
});
