import { renderHook, waitFor } from "@testing-library/react-native";

import { useDecryptedContent } from "@/hooks/useDecryptedContent";
import {
    clearDecryptCache,
    decryptMessageContent,
    ENC_PREFIX,
    peekDecrypted,
    UNREADABLE_PLACEHOLDER,
} from "@/services/messageCrypto";

jest.mock("@/services/messageCrypto", () => {
    const actual = jest.requireActual("@/services/messageCrypto");
    return {
        ...actual,
        decryptMessageContent: jest.fn(actual.decryptMessageContent),
    };
});

const mockDecrypt = jest.mocked(decryptMessageContent);

describe("useDecryptedContent", () => {
    beforeEach(() => {
        clearDecryptCache();
        mockDecrypt.mockReset();
    });

    it("returns plaintext immediately without pending state", async () => {
        const { result } = await renderHook(() =>
            useDecryptedContent("Hello plaintext")
        );
        expect(result.current.text).toBe("Hello plaintext");
        expect(result.current.isPending).toBe(false);
    });

    it("handles null and undefined content immediately", async () => {
        const { result: rNull } = await renderHook(() =>
            useDecryptedContent(null)
        );
        expect(rNull.current.text).toBe("");
        expect(rNull.current.isPending).toBe(false);

        const { result: rUndef } = await renderHook(() =>
            useDecryptedContent(undefined)
        );
        expect(rUndef.current.text).toBe("");
        expect(rUndef.current.isPending).toBe(false);
    });

    it("transitions from isPending: true to decrypted text when async decryption resolves", async () => {
        let resolveFn: (text: string) => void = () => {};
        const fakeCipher = `${ENC_PREFIX}custom_test_cipher_1`;

        mockDecrypt.mockImplementation(
            () =>
                new Promise<string>((resolve) => {
                    resolveFn = resolve;
                })
        );

        const { result } = await renderHook(() =>
            useDecryptedContent(fakeCipher)
        );

        expect(result.current.isPending).toBe(true);
        expect(result.current.text).toBe("");

        resolveFn("Decrypted secret text");

        await waitFor(() => {
            expect(result.current.isPending).toBe(false);
        });
        expect(result.current.text).toBe("Decrypted secret text");
    });

    it("serves from settled cache synchronously on mount if already settled", async () => {
        const actual = jest.requireActual("@/services/messageCrypto");
        const fakeCipher = `${ENC_PREFIX}custom_test_cipher_2`;

        mockDecrypt.mockImplementation(actual.decryptMessageContent);
        await decryptMessageContent(fakeCipher);
        expect(peekDecrypted(fakeCipher)).toBe(UNREADABLE_PLACEHOLDER);

        const { result } = await renderHook(() =>
            useDecryptedContent(fakeCipher)
        );
        expect(result.current.isPending).toBe(false);
        expect(result.current.text).toBe(UNREADABLE_PLACEHOLDER);
    });

    it("transitions out of isPending: true when decryption rejects", async () => {
        let rejectFn: (err: Error) => void = () => {};
        const fakeCipher = `${ENC_PREFIX}custom_broken_cipher_3`;

        mockDecrypt.mockImplementation(
            () =>
                new Promise<string>((_, reject) => {
                    rejectFn = reject;
                })
        );

        const { result } = await renderHook(() =>
            useDecryptedContent(fakeCipher)
        );

        expect(result.current.isPending).toBe(true);

        rejectFn(new Error("Decryption failed"));

        await waitFor(() => {
            expect(result.current.isPending).toBe(false);
        });

        expect(result.current.text).toBe(UNREADABLE_PLACEHOLDER);
    });

    it("correctly updates when content prop changes (simulating FlatList cell recycling)", async () => {
        const cipherA = `${ENC_PREFIX}cipher_A`;
        const cipherB = `${ENC_PREFIX}cipher_B`;

        mockDecrypt.mockImplementation(async (c) => {
            if (c === cipherA) return "Text A";
            if (c === cipherB) return "Text B";
            return "";
        });

        const { result, rerender } = await renderHook(
            (props: { content: string }) => useDecryptedContent(props.content),
            { initialProps: { content: cipherA } }
        );

        await waitFor(() => {
            expect(result.current.isPending).toBe(false);
        });
        expect(result.current.text).toBe("Text A");

        // Recycle the hook with cipherB
        await rerender({ content: cipherB });

        await waitFor(() => {
            expect(result.current.isPending).toBe(false);
        });
        expect(result.current.text).toBe("Text B");
    });
});
