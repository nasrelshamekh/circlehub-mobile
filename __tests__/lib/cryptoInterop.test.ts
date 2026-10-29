/**
 * Cross-platform E2EE interop: the web client's WebCrypto code path and the mobile client's @noble code
 * path must produce and consume byte-identical envelopes, wrap keys, and key backups. The in-app tests
 * only cover mobile-internal round-trips, so without these the two implementations could silently drift
 * (a web-sealed `ENC:v1:` message would stop opening on mobile, or vice versa).
 *
 * The WebCrypto side is exercised here exactly as `CircleHub/src/services/messageCrypto.js` does it, so
 * these assertions fail if either implementation changes shape.
 */
import { gcm } from "@noble/ciphers/aes.js";
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

import {
    ENC_PREFIX,
    PADDING_BLOCK_SIZE,
    padPlaintext,
    unpadPlaintext,
} from "@/services/messageCrypto";

const subtle = globalThis.crypto.subtle;

const enc = new TextEncoder();
const dec = new TextDecoder();

const HKDF_INFO = enc.encode("CircleHub v1 message key wrap");
const EMPTY_SALT = new Uint8Array(0);

function b64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString("base64");
}

/**
 * Returns a view backed by a plain `ArrayBuffer` so it satisfies WebCrypto's `BufferSource`, which the
 * generic `Uint8Array<ArrayBufferLike>` does not (Buffer.from may hand back a SharedArrayBuffer view).
 */
function unb64(str: string): Uint8Array<ArrayBuffer> {
    const decoded = Buffer.from(str, "base64");
    const out = new Uint8Array(decoded.length);
    out.set(decoded);
    return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Web's keyRecovery.js hardcodes the PKCS#8 DER framing (138 bytes, scalar at [36..68]).
const PKCS8_HEADER = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01,
    0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
]);
const PKCS8_MID = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00]);

describe("web (WebCrypto) <-> mobile (@noble) E2EE interop", () => {
    it("exports a P-256 PKCS#8 that matches web's hardcoded DER framing", async () => {
        const pair = await subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"]
        );
        const pkcs8 = new Uint8Array(
            await subtle.exportKey("pkcs8", pair.privateKey)
        );

        expect(pkcs8.length).toBe(138);
        expect(bytesEqual(pkcs8.slice(0, 36), PKCS8_HEADER)).toBe(true);
        expect(bytesEqual(pkcs8.slice(68, 73), PKCS8_MID)).toBe(true);
    });

    it("derives the same public key: WebCrypto raw export vs p256.getPublicKey", async () => {
        const pair = await subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"]
        );
        const pkcs8 = new Uint8Array(
            await subtle.exportKey("pkcs8", pair.privateKey)
        );
        const pubRaw = new Uint8Array(
            await subtle.exportKey("raw", pair.publicKey)
        );

        const scalar = pkcs8.slice(36, 68);
        expect(bytesEqual(p256.getPublicKey(scalar, false), pubRaw)).toBe(true);
    });

    it("mobile-sealed envelope decrypts in the web (WebCrypto) path", async () => {
        const devicePair = await subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"]
        );
        const devicePkcs8 = new Uint8Array(
            await subtle.exportKey("pkcs8", devicePair.privateKey)
        );
        const devicePubRaw = new Uint8Array(
            await subtle.exportKey("raw", devicePair.publicKey)
        );

        const plaintext = "Interop check — mobile sealed, web opened";
        const cek = globalThis.crypto.getRandomValues(new Uint8Array(32));
        const contentIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const ct = gcm(cek, contentIv).encrypt(enc.encode(plaintext));

        const ephScalar = globalThis.crypto.getRandomValues(new Uint8Array(32));
        const ephPubNoble = p256.getPublicKey(ephScalar, false);

        // Mobile deriveWrapKey: shared = p256.getSharedSecret(..., false)[1..33], HKDF-SHA256.
        const sharedMobile = p256
            .getSharedSecret(ephScalar, devicePubRaw, false)
            .slice(1, 33);
        const wrapKeyMobile = hkdf(sha256, sharedMobile, EMPTY_SALT, HKDF_INFO, 32);
        const wrapIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const wrappedMobile = gcm(wrapKeyMobile, wrapIv).encrypt(cek);

        const envelope = JSON.stringify({
            v: 1,
            alg: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
            e: b64(ephPubNoble),
            iv: b64(contentIv),
            ct: b64(ct),
            w: [
                {
                    d: "web-device",
                    k: b64(new Uint8Array([...wrapIv, ...wrappedMobile])),
                },
            ],
        });
        const env = JSON.parse(envelope);

        // The stored form is the ENC:v1: prefix plus base64 of the JSON envelope.
        expect(`${ENC_PREFIX}${b64(enc.encode(envelope))}`.startsWith(ENC_PREFIX)).toBe(
            true
        );

        // Web decryptEnvelope / deriveWrapKey path: subtle ECDH -> HKDF -> AES-GCM.
        const ephPubKey = await subtle.importKey(
            "raw",
            unb64(env.e),
            { name: "ECDH", namedCurve: "P-256" },
            false,
            []
        );
        const sharedWeb = new Uint8Array(
            await subtle.deriveBits(
                { name: "ECDH", public: ephPubKey },
                devicePair.privateKey,
                256
            )
        );
        expect(bytesEqual(sharedWeb, sharedMobile)).toBe(true);

        const hkdfKey = await subtle.importKey("raw", sharedWeb, "HKDF", false, [
            "deriveBits",
        ]);
        const wrapBitsWeb = new Uint8Array(
            await subtle.deriveBits(
                { name: "HKDF", hash: "SHA-256", salt: EMPTY_SALT, info: HKDF_INFO },
                hkdfKey,
                256
            )
        );
        expect(bytesEqual(wrapBitsWeb, wrapKeyMobile)).toBe(true);

        const packed = unb64(env.w[0].k);
        const cekWeb = await subtle.decrypt(
            { name: "AES-GCM", iv: packed.slice(0, 12) },
            await subtle.importKey("raw", wrapBitsWeb, { name: "AES-GCM" }, false, [
                "decrypt",
            ]),
            packed.slice(12)
        );
        expect(bytesEqual(new Uint8Array(cekWeb), cek)).toBe(true);

        const plainWeb = await subtle.decrypt(
            { name: "AES-GCM", iv: unb64(env.iv) },
            await subtle.importKey(
                "raw",
                new Uint8Array(cekWeb),
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            ),
            unb64(env.ct)
        );
        expect(dec.decode(plainWeb)).toBe(plaintext);
    });

    it("web-sealed envelope decrypts in the mobile (@noble) path", async () => {
        const devicePair = await subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"]
        );
        const devicePkcs8 = new Uint8Array(
            await subtle.exportKey("pkcs8", devicePair.privateKey)
        );
        const deviceScalar = devicePkcs8.slice(36, 68);

        const plaintext = "Interop check — web sealed, mobile opened";
        const ephPair = await subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"]
        );
        const ephPubWeb = new Uint8Array(
            await subtle.exportKey("raw", ephPair.publicKey)
        );

        const cek = globalThis.crypto.getRandomValues(new Uint8Array(32));
        const contentIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(
            await subtle.encrypt(
                { name: "AES-GCM", iv: contentIv },
                await subtle.importKey("raw", cek, { name: "AES-GCM" }, false, [
                    "encrypt",
                ]),
                enc.encode(plaintext)
            )
        );
        const wrapIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const devicePubRaw = new Uint8Array(
            await subtle.exportKey("raw", devicePair.publicKey)
        );
        const sharedWeb = new Uint8Array(
            await subtle.deriveBits(
                {
                    name: "ECDH",
                    public: await subtle.importKey(
                        "raw",
                        devicePubRaw,
                        { name: "ECDH", namedCurve: "P-256" },
                        false,
                        []
                    ),
                },
                ephPair.privateKey,
                256
            )
        );
        const hkdfKey = await subtle.importKey("raw", sharedWeb, "HKDF", false, [
            "deriveBits",
        ]);
        const wrapKeyWeb = new Uint8Array(
            await subtle.deriveBits(
                { name: "HKDF", hash: "SHA-256", salt: EMPTY_SALT, info: HKDF_INFO },
                hkdfKey,
                256
            )
        );
        const wrappedWeb = new Uint8Array(
            await subtle.encrypt(
                { name: "AES-GCM", iv: wrapIv },
                await subtle.importKey("raw", wrapKeyWeb, { name: "AES-GCM" }, false, [
                    "encrypt",
                ]),
                cek
            )
        );

        const env = JSON.parse(
            JSON.stringify({
                v: 1,
                alg: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
                e: b64(ephPubWeb),
                iv: b64(contentIv),
                ct: b64(ct),
                w: [
                    {
                        d: "mobile-device",
                        k: b64(new Uint8Array([...wrapIv, ...wrappedWeb])),
                    },
                ],
            })
        );

        // Mobile decryptEnvelope path.
        const sharedMobile = p256
            .getSharedSecret(deviceScalar, unb64(env.e), false)
            .slice(1, 33);
        expect(bytesEqual(sharedMobile, sharedWeb)).toBe(true);

        const wrapKeyMobile = hkdf(sha256, sharedMobile, EMPTY_SALT, HKDF_INFO, 32);
        expect(bytesEqual(wrapKeyMobile, wrapKeyWeb)).toBe(true);

        const packed = unb64(env.w[0].k);
        const cekMobile = gcm(wrapKeyMobile, packed.slice(0, 12)).decrypt(
            packed.slice(12)
        );
        expect(bytesEqual(cekMobile, cek)).toBe(true);

        const plainMobile = gcm(cekMobile, unb64(env.iv)).decrypt(unb64(env.ct));
        expect(dec.decode(plainMobile)).toBe(plaintext);
    });

    it("key backups are interchangeable: PBKDF2 + AES-GCM wrap of the 97-byte portable key", async () => {
        const devicePair = await subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"]
        );
        const devicePkcs8 = new Uint8Array(
            await subtle.exportKey("pkcs8", devicePair.privateKey)
        );
        const devicePubRaw = new Uint8Array(
            await subtle.exportKey("raw", devicePair.publicKey)
        );

        // Portable 97-byte backup format (both clients): 32B scalar || 65B uncompressed pub.
        const portable = new Uint8Array(97);
        portable.set(devicePkcs8.slice(36, 68), 0);
        portable.set(devicePkcs8.slice(73, 138), 32);
        expect(portable.length).toBe(97);

        const phrase =
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));

        // Web derivePhraseKey: subtle PBKDF2 -> AES-GCM 256 key.
        const phraseKeyWeb = await subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
            await subtle.importKey("raw", enc.encode(phrase), "PBKDF2", false, [
                "deriveKey",
            ]),
            { name: "AES-GCM", length: 256 },
            // extractable only so the test can compare raw bytes; the real web key is not.
            true,
            ["encrypt", "decrypt"]
        );
        // Mobile derivePhraseKey: noble pbkdf2 -> raw 32 bytes.
        const phraseKeyNoble = pbkdf2(sha256, enc.encode(phrase), salt, {
            c: 100_000,
            dkLen: 32,
        });

        const phraseKeyWebRaw = new Uint8Array(
            await subtle.exportKey("raw", phraseKeyWeb)
        );
        expect(bytesEqual(phraseKeyWebRaw, phraseKeyNoble)).toBe(true);

        // Web seals the portable key; mobile opens it.
        const ivSeal = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const sealedByWeb = new Uint8Array(
            await subtle.encrypt({ name: "AES-GCM", iv: ivSeal }, phraseKeyWeb, portable)
        );
        expect(bytesEqual(gcm(phraseKeyNoble, ivSeal).decrypt(sealedByWeb), portable)).toBe(
            true
        );

        // Mobile seals; web opens.
        const ivSeal2 = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const sealedByMobile = gcm(phraseKeyNoble, ivSeal2).encrypt(portable);
        const openedByWeb = new Uint8Array(
            await subtle.decrypt(
                { name: "AES-GCM", iv: ivSeal2 },
                phraseKeyWeb,
                sealedByMobile
            )
        );
        expect(bytesEqual(openedByWeb, portable)).toBe(true);

        // Mobile rebuilds PKCS#8 from the restored portable key, like web's portableKeyToPkcs8.
        const rebuilt = new Uint8Array(138);
        rebuilt.set(PKCS8_HEADER, 0);
        rebuilt.set(openedByWeb.slice(0, 32), 36);
        rebuilt.set(PKCS8_MID, 68);
        rebuilt.set(openedByWeb.slice(32, 97), 73);

        const imported = await subtle.importKey(
            "pkcs8",
            rebuilt,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveBits"]
        );
        expect(Boolean(imported)).toBe(true);
        expect(bytesEqual(p256.getPublicKey(rebuilt.slice(36, 68), false), devicePubRaw)).toBe(
            true
        );
    });

    describe("Phase 1: Cryptographic Envelope Hardening (AAD + Padding)", () => {
        it("pads and unpads arbitrarily-sized plaintexts with 128-byte block padding", () => {
            const cases = [
                "",
                "a",
                "hello world",
                "x".repeat(127),
                "x".repeat(128),
                "x".repeat(129),
                "Emoji: 🔒✨🎉🚀 and non-ascii üöä",
            ];

            for (const text of cases) {
                const padded = padPlaintext(text);
                expect(padded.length % PADDING_BLOCK_SIZE).toBe(0);
                expect(padded.length).toBeGreaterThan(0);
                const unpadded = unpadPlaintext(padded);
                expect(unpadded).toBe(text);
            }

            // Safe unpad on malformed/unpadded input
            const rawBytes = enc.encode("no-padding-here");
            expect(unpadPlaintext(rawBytes)).toBe("no-padding-here");
        });

        it("mobile-sealed Phase 1 envelope (AAD + padding) decrypts in web (WebCrypto) path", async () => {
            const devicePair = await subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                true,
                ["deriveKey", "deriveBits"]
            );
            const devicePubRaw = new Uint8Array(
                await subtle.exportKey("raw", devicePair.publicKey)
            );

            const plaintext = "Phase 1 Hardened: mobile sealed -> web opened 🔒";
            const cek = globalThis.crypto.getRandomValues(new Uint8Array(32));
            const contentIv = globalThis.crypto.getRandomValues(new Uint8Array(12));

            const ephScalar = globalThis.crypto.getRandomValues(new Uint8Array(32));
            const ephPubNoble = p256.getPublicKey(ephScalar, false);
            const ephB64 = b64(ephPubNoble);

            const payloadAad = enc.encode("circlehub:v1:" + ephB64);
            const paddedPlaintext = padPlaintext(plaintext);
            const ct = gcm(cek, contentIv, payloadAad).encrypt(paddedPlaintext);

            const sharedMobile = p256
                .getSharedSecret(ephScalar, devicePubRaw, false)
                .slice(1, 33);
            const wrapKeyMobile = hkdf(sha256, sharedMobile, EMPTY_SALT, HKDF_INFO, 32);
            const wrapIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
            const targetDeviceId = "web-phase1-device";
            const wrapAad = enc.encode(targetDeviceId + ":" + ephB64);
            const wrappedMobile = gcm(wrapKeyMobile, wrapIv, wrapAad).encrypt(cek);

            const envelope = JSON.stringify({
                v: 1,
                p: 1,
                alg: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
                e: ephB64,
                iv: b64(contentIv),
                ct: b64(ct),
                w: [
                    {
                        d: targetDeviceId,
                        k: b64(new Uint8Array([...wrapIv, ...wrappedMobile])),
                    },
                ],
            });
            const env = JSON.parse(envelope);
            expect(env.p).toBe(1);

            // Web decrypts wrap with wrapAad
            const ephPubKey = await subtle.importKey(
                "raw",
                unb64(env.e),
                { name: "ECDH", namedCurve: "P-256" },
                false,
                []
            );
            const sharedWeb = new Uint8Array(
                await subtle.deriveBits(
                    { name: "ECDH", public: ephPubKey },
                    devicePair.privateKey,
                    256
                )
            );
            const hkdfKey = await subtle.importKey("raw", sharedWeb, "HKDF", false, [
                "deriveBits",
            ]);
            const wrapBitsWeb = new Uint8Array(
                await subtle.deriveBits(
                    { name: "HKDF", hash: "SHA-256", salt: EMPTY_SALT, info: HKDF_INFO },
                    hkdfKey,
                    256
                )
            );

            const packed = unb64(env.w[0].k);
            const expectedWrapAad = enc.encode(env.w[0].d + ":" + env.e);
            const cekWeb = await subtle.decrypt(
                { name: "AES-GCM", iv: packed.slice(0, 12), additionalData: expectedWrapAad },
                await subtle.importKey("raw", wrapBitsWeb, { name: "AES-GCM" }, false, [
                    "decrypt",
                ]),
                packed.slice(12)
            );
            expect(bytesEqual(new Uint8Array(cekWeb), cek)).toBe(true);

            // Web decrypts content with payloadAad and unpads
            const expectedPayloadAad = enc.encode("circlehub:v1:" + env.e);
            const decryptedPaddedBytes = await subtle.decrypt(
                { name: "AES-GCM", iv: unb64(env.iv), additionalData: expectedPayloadAad },
                await subtle.importKey("raw", new Uint8Array(cekWeb), { name: "AES-GCM" }, false, [
                    "decrypt",
                ]),
                unb64(env.ct)
            );
            const unpaddedPlaintext = unpadPlaintext(new Uint8Array(decryptedPaddedBytes));
            expect(unpaddedPlaintext).toBe(plaintext);
        });

        it("web-sealed Phase 1 envelope (AAD + padding) decrypts in mobile (@noble) path", async () => {
            const devicePair = await subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                true,
                ["deriveKey", "deriveBits"]
            );
            const devicePkcs8 = new Uint8Array(
                await subtle.exportKey("pkcs8", devicePair.privateKey)
            );
            const deviceScalar = devicePkcs8.slice(36, 68);

            const plaintext = "Phase 1 Hardened: web sealed -> mobile opened 🛡️";
            const ephPair = await subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                true,
                ["deriveKey", "deriveBits"]
            );
            const ephPubWeb = new Uint8Array(
                await subtle.exportKey("raw", ephPair.publicKey)
            );
            const ephB64 = b64(ephPubWeb);

            const cek = globalThis.crypto.getRandomValues(new Uint8Array(32));
            const contentIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
            const targetDeviceId = "mobile-phase1-device";

            // Web seals payload with AAD + padding
            const payloadAad = enc.encode("circlehub:v1:" + ephB64);
            const padded = padPlaintext(plaintext);
            const ct = new Uint8Array(
                await subtle.encrypt(
                    { name: "AES-GCM", iv: contentIv, additionalData: payloadAad },
                    await subtle.importKey("raw", cek, { name: "AES-GCM" }, false, [
                        "encrypt",
                    ]),
                    padded as unknown as BufferSource
                )
            );

            // Web derives wrap key and seals with wrapAad
            const devicePubRaw = new Uint8Array(
                await subtle.exportKey("raw", devicePair.publicKey)
            );
            const sharedWeb = new Uint8Array(
                await subtle.deriveBits(
                    {
                        name: "ECDH",
                        public: await subtle.importKey(
                            "raw",
                            devicePubRaw,
                            { name: "ECDH", namedCurve: "P-256" },
                            false,
                            []
                        ),
                    },
                    ephPair.privateKey,
                    256
                )
            );
            const hkdfKey = await subtle.importKey("raw", sharedWeb, "HKDF", false, [
                "deriveBits",
            ]);
            const wrapKeyWeb = new Uint8Array(
                await subtle.deriveBits(
                    { name: "HKDF", hash: "SHA-256", salt: EMPTY_SALT, info: HKDF_INFO },
                    hkdfKey,
                    256
                )
            );

            const wrapIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
            const wrapAad = enc.encode(targetDeviceId + ":" + ephB64);
            const wrappedWeb = new Uint8Array(
                await subtle.encrypt(
                    { name: "AES-GCM", iv: wrapIv, additionalData: wrapAad },
                    await subtle.importKey("raw", wrapKeyWeb, { name: "AES-GCM" }, false, [
                        "encrypt",
                    ]),
                    cek
                )
            );

            const env = {
                v: 1,
                p: 1,
                alg: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
                e: ephB64,
                iv: b64(contentIv),
                ct: b64(ct),
                w: [
                    {
                        d: targetDeviceId,
                        k: b64(new Uint8Array([...wrapIv, ...wrappedWeb])),
                    },
                ],
            };

            // Mobile opens wrap with wrapAad
            const sharedMobile = p256
                .getSharedSecret(deviceScalar, unb64(env.e), false)
                .slice(1, 33);
            const wrapKeyMobile = hkdf(sha256, sharedMobile, EMPTY_SALT, HKDF_INFO, 32);
            const packed = unb64(env.w[0].k);
            const wrapIvNoble = packed.slice(0, 12);
            const wrappedKeyNoble = packed.slice(12);

            const expectedWrapAad = enc.encode(env.w[0].d + ":" + env.e);
            const cekMobile = gcm(wrapKeyMobile, wrapIvNoble, expectedWrapAad).decrypt(
                wrappedKeyNoble
            );
            expect(bytesEqual(cekMobile, cek)).toBe(true);

            // Mobile opens payload with payloadAad and unpads
            const expectedPayloadAad = enc.encode("circlehub:v1:" + env.e);
            const plaintextPadded = gcm(
                cekMobile,
                unb64(env.iv),
                expectedPayloadAad
            ).decrypt(unb64(env.ct));
            const resultText = unpadPlaintext(plaintextPadded);
            expect(resultText).toBe(plaintext);
        });

        it("fails authentication when envelope or wrap metadata is tampered with (AAD integrity check)", async () => {
            const devicePair = await subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                true,
                ["deriveKey", "deriveBits"]
            );
            const plaintext = "Authenticity check";
            const ephScalar = globalThis.crypto.getRandomValues(new Uint8Array(32));
            const ephPubNoble = p256.getPublicKey(ephScalar, false);
            const ephB64 = b64(ephPubNoble);

            const cek = globalThis.crypto.getRandomValues(new Uint8Array(32));
            const contentIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
            const payloadAad = enc.encode("circlehub:v1:" + ephB64);
            const ct = gcm(cek, contentIv, payloadAad).encrypt(padPlaintext(plaintext));

            const devicePubRaw = new Uint8Array(
                await subtle.exportKey("raw", devicePair.publicKey)
            );
            const shared = p256
                .getSharedSecret(ephScalar, devicePubRaw, false)
                .slice(1, 33);
            const wrapKey = hkdf(sha256, shared, EMPTY_SALT, HKDF_INFO, 32);
            const wrapIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
            const wrapAad = enc.encode("target-device-1:" + ephB64);
            const wrapped = gcm(wrapKey, wrapIv, wrapAad).encrypt(cek);

            // Tamper 1: Attempt to open wrap using wrong device ID in AAD
            const tamperedWrapAad = enc.encode("different-device:" + ephB64);
            expect(() => {
                gcm(wrapKey, wrapIv, tamperedWrapAad).decrypt(wrapped);
            }).toThrow();

            // Tamper 2: Attempt to open payload using altered ephemeral key in AAD
            const alteredPayloadAad = enc.encode("circlehub:v1:tampered-ephemeral-key");
            expect(() => {
                gcm(cek, contentIv, alteredPayloadAad).decrypt(ct);
            }).toThrow();
        });
    });
});
