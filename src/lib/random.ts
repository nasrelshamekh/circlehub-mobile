import { sha256 } from "@noble/hashes/sha2.js";
import { requireOptionalNativeModule } from "expo-modules-core";

type ExpoCryptoModule = {
    getRandomBytes: (size: number) => Uint8Array;
    randomUUID?: () => string;
};

let cachedExpoCrypto: ExpoCryptoModule | null | undefined;
let fallbackCounter = 0;

function getExpoCrypto(): ExpoCryptoModule | null {
    if (cachedExpoCrypto !== undefined) {
        return cachedExpoCrypto;
    }
    try {
        if (!requireOptionalNativeModule("ExpoCrypto")) {
            cachedExpoCrypto = null;
            return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        cachedExpoCrypto = require("expo-crypto") as ExpoCryptoModule;
    } catch {
        cachedExpoCrypto = null;
    }
    return cachedExpoCrypto;
}

export function getRandomBytes(size: number): Uint8Array {
    const expoCrypto = getExpoCrypto();
    if (expoCrypto?.getRandomBytes) {
        try {
            return expoCrypto.getRandomBytes(size);
        } catch {
            // Fall through if native module is unavailable in current dev client.
        }
    }

    if (
        typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.getRandomValues === "function"
    ) {
        return globalThis.crypto.getRandomValues(new Uint8Array(size));
    }

    // Fallback entropy mixer for older dev-client builds without native ExpoCrypto
    const out = new Uint8Array(size);
    let offset = 0;
    while (offset < size) {
        fallbackCounter += 1;
        const seed = `${Date.now()}:${performance.now()}:${Math.random()}:${Math.random()}:${fallbackCounter}`;
        const block = sha256(new TextEncoder().encode(seed));
        const take = Math.min(block.length, size - offset);
        out.set(block.subarray(0, take), offset);
        offset += take;
    }
    return out;
}

export function randomUUID(): string {
    const expoCrypto = getExpoCrypto();
    if (expoCrypto?.randomUUID) {
        try {
            return expoCrypto.randomUUID();
        } catch {
            // Fall through
        }
    }

    if (
        typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
    ) {
        return globalThis.crypto.randomUUID();
    }

    const bytes = getRandomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
        ""
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
