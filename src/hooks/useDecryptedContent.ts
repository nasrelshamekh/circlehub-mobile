import { useEffect, useState, useSyncExternalStore } from "react";

import {
    decryptMessageContent,
    getDecryptCacheVersion,
    isEncryptedContent,
    peekDecrypted,
    subscribeDecryptCache,
    UNREADABLE_PLACEHOLDER,
} from "@/services/messageCrypto";

/**
 * Resolves the readable text for a stored message body. Encrypted content decrypts
 * asynchronously, so the result carries `isPending` alongside the text: callers render a
 * loading placeholder while it is true instead of an empty bubble, and render the
 * resolved value (plaintext or the unreadable placeholder) once it settles.
 */
export function useDecryptedContent(content?: string | null): {
    text: string;
    isPending: boolean;
} {
    const cacheVersion = useSyncExternalStore(
        subscribeDecryptCache,
        getDecryptCacheVersion,
        getDecryptCacheVersion
    );

    const isEncrypted = isEncryptedContent(content);
    const settled = isEncrypted ? peekDecrypted(content) : null;

    const [resolved, setResolved] = useState<{
        content: string | null | undefined;
        text: string;
        isPending: boolean;
    }>(() => ({
        content,
        text: settled ?? (isEncrypted ? "" : (content ?? "")),
        isPending: isEncrypted && settled === null,
    }));

    useEffect(() => {
        if (!isEncrypted || !content) return undefined;
        if (peekDecrypted(content) !== null) return undefined;

        let cancelled = false;

        decryptMessageContent(content)
            .then((text) => {
                if (!cancelled) {
                    setResolved({ content, text, isPending: false });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResolved({
                        content,
                        text: UNREADABLE_PLACEHOLDER,
                        isPending: false,
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [content, isEncrypted, cacheVersion]);

    if (!isEncrypted) {
        return { text: content ?? "", isPending: false };
    }

    if (settled !== null) {
        return { text: settled, isPending: false };
    }

    if (resolved.content === content) {
        return { text: resolved.text, isPending: resolved.isPending };
    }

    return { text: "", isPending: true };
}
