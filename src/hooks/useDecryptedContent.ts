import { useEffect, useState, useSyncExternalStore } from "react";

import {
    decryptMessageContent,
    getDecryptCacheVersion,
    isEncryptedContent,
    peekDecrypted,
    subscribeDecryptCache,
} from "@/services/messageCrypto";

export function useDecryptedContent(content?: string | null): string {
    const cacheVersion = useSyncExternalStore(
        subscribeDecryptCache,
        getDecryptCacheVersion,
        getDecryptCacheVersion
    );

    const [resolved, setResolved] = useState<{
        source: string | null | undefined;
        version: number;
        text: string;
    }>(() => ({
        source: content,
        version: cacheVersion,
        text: isEncryptedContent(content)
            ? (peekDecrypted(content) ?? "")
            : (content ?? ""),
    }));

    const needsDecrypt =
        isEncryptedContent(content) && peekDecrypted(content) === null;

    useEffect(() => {
        if (!needsDecrypt || !content) return undefined;

        let cancelled = false;

        decryptMessageContent(content).then((text) => {
            if (!cancelled) {
                setResolved({ source: content, version: cacheVersion, text });
            }
        });

        return () => {
            cancelled = true;
        };
    }, [content, needsDecrypt, cacheVersion]);

    if (!isEncryptedContent(content)) return content ?? "";

    const settled = peekDecrypted(content);
    if (settled !== null) return settled;

    return resolved.source === content && resolved.version === cacheVersion
        ? resolved.text
        : "";
}
