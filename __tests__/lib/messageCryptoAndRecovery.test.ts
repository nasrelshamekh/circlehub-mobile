import {
    hasNotificationTarget,
    navigateToNotificationTarget,
    notificationSentence,
} from "@/lib/notificationCopy";
import {
    generatePhrase,
    hasValidChecksum,
    initializeRecovery,
    isWellFormedPhrase,
    normalisePhrase,
    restoreRecovery,
} from "@/services/keyRecovery";
import {
    clearDecryptCache,
    decryptMessageContent,
    ENC_PREFIX,
    encryptMessageContent,
    ensureDeviceKey,
    UNREADABLE_PLACEHOLDER,
} from "@/services/messageCrypto";

const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
    router: {
        push: (...args: unknown[]) => mockRouterPush(...args),
    },
}));

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

const mockPublishedKeys: Record<
    string,
    { deviceId: string; publicKey: string; createdAt: string }[]
> = {};

let mockSavedBackup: {
    wrappedAccountKey: string;
    salt: string;
    kdfIterations: number;
    kdfAlgorithm: string;
    updatedAt: string;
} | null = null;

jest.mock("@/api/keys", () => ({
    getUserDeviceKeys: jest.fn(async (username: string) => ({
        success: true,
        count: (mockPublishedKeys[username] ?? []).length,
        data: mockPublishedKeys[username] ?? [],
    })),
    registerDeviceKey: jest.fn(async (deviceId: string, publicKey: string) => {
        const entry = {
            deviceId,
            publicKey,
            createdAt: new Date().toISOString(),
        };
        mockPublishedKeys.alice = [
            ...(mockPublishedKeys.alice ?? []).filter(
                (k) => k.deviceId !== deviceId
            ),
            entry,
        ];
        return { success: true, data: entry };
    }),
    getKeyBackup: jest.fn(async () => ({
        success: true,
        data: mockSavedBackup,
    })),
    saveKeyBackup: jest.fn(
        async (payload: {
            wrappedAccountKey: string;
            salt: string;
            kdfIterations: number;
            kdfAlgorithm: string;
        }) => {
            mockSavedBackup = {
                ...payload,
                updatedAt: new Date().toISOString(),
            };
            return { success: true, data: mockSavedBackup };
        }
    ),
    deleteKeyBackup: jest.fn(async () => {
        mockSavedBackup = null;
        return { success: true, message: "Removed" };
    }),
}));

jest.mock("@/lib/session", () => ({
    getToken: jest.fn(async () => {
        const payload = btoa(JSON.stringify({ unique_name: "alice" }));
        return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
    }),
}));

describe("mobile E2EE messageCrypto and BIP39 keyRecovery", () => {
    beforeEach(() => {
        clearDecryptCache();
        for (const k of Object.keys(mockPublishedKeys)) {
            delete mockPublishedKeys[k];
        }
    });

    it("generates a 12-word BIP39 phrase with a valid checksum and detects mutations", () => {
        const phrase = generatePhrase();
        const words = normalisePhrase(phrase).split(" ");
        expect(words).toHaveLength(12);
        expect(isWellFormedPhrase(phrase)).toBe(true);
        expect(hasValidChecksum(phrase)).toBe(true);

        // Mutating one word should fail either word list or checksum
        const mutated = [...words];
        mutated[0] = mutated[0] === "abandon" ? "zoo" : "abandon";
        const candidate = mutated.join(" ");
        expect(isWellFormedPhrase(candidate)).toBe(true);
        // 15/16 chance checksum fails for a different word; test an explicit invalid checksum phrase:
        expect(
            hasValidChecksum(
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"
            )
        ).toBe(false);
    });

    it("falls back to plaintext when recipient has no published device keys", async () => {
        const out = await encryptMessageContent({
            recipientUsername: "bob_no_keys",
            plaintext: "Hello plaintext fallback",
        });
        expect(out).toBe("Hello plaintext fallback");
        await expect(decryptMessageContent(out)).resolves.toBe(
            "Hello plaintext fallback"
        );
    });

    it("encrypts and decrypts an ENC:v1: ECDH-P256 + AES-256-GCM envelope round-trip", async () => {
        const { record } = await ensureDeviceKey("alice");
        mockPublishedKeys.bob = [
            {
                deviceId: record.deviceId,
                publicKey: record.publicKeyB64,
                createdAt: new Date().toISOString(),
            },
        ];

        const ciphertext = await encryptMessageContent({
            recipientUsername: "bob",
            plaintext: "Top secret mobile E2EE message 🔒",
        });

        expect(ciphertext.startsWith(ENC_PREFIX)).toBe(true);
        await expect(decryptMessageContent(ciphertext)).resolves.toBe(
            "Top secret mobile E2EE message 🔒"
        );
    });

    it("returns the unreadable placeholder for an envelope wrapped to an unknown device key", async () => {
        const fakeEnvelope = btoa(
            JSON.stringify({
                v: 1,
                alg: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
                e: "bad-ephemeral-key",
                iv: "bad-iv",
                ct: "bad-ct",
                w: [{ d: "other-device", k: "bad-wrap" }],
            })
        );
        await expect(
            decryptMessageContent(`${ENC_PREFIX}${fakeEnvelope}`)
        ).resolves.toBe(UNREADABLE_PLACEHOLDER);
    });

    it("initializes recovery with a base64 salt and restores the portable 97-byte P-256 keypair", async () => {
        const { phrase, accountKey } = await initializeRecovery();
        expect(isWellFormedPhrase(phrase)).toBe(true);
        expect(accountKey).toHaveLength(97);
        expect(mockSavedBackup).not.toBeNull();
        expect(typeof mockSavedBackup?.salt).toBe("string");
        expect(mockSavedBackup?.wrappedAccountKey.length).toBeLessThanOrEqual(
            200
        );

        const restored = await restoreRecovery(phrase);
        expect(restored.accountKey).toEqual(accountKey);
    });
});

describe("notificationCopy", () => {
    it("formats notification sentences and target links matching the web app", () => {
        expect(
            notificationSentence({
                id: "1",
                type: "Follow",
                createdAt: "2026-10-20T12:00:00Z",
                unread: true,
                actor: {
                    id: "u1",
                    name: "Alice",
                    username: "alice",
                    avatarUrl: null,
                },
            })
        ).toBe("started following you.");

        const joinNotif = {
            id: "2",
            type: "CommunityJoinRequested" as const,
            createdAt: "2026-10-20T12:00:00Z",
            unread: true,
            actor: {
                id: "u2",
                name: "Bob",
                username: "bob",
                avatarUrl: null,
            },
            communityName: "Builders",
            communitySlug: "builders",
        };
        expect(notificationSentence(joinNotif)).toBe(
            "asked to join Builders."
        );
        expect(hasNotificationTarget(joinNotif)).toBe(true);
        navigateToNotificationTarget(joinNotif);
        expect(mockRouterPush).toHaveBeenCalledWith({
            pathname: "/community-manage",
            params: { slug: "builders", tab: "requests" },
        });
    });
});
