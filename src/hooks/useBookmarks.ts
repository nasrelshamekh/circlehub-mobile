import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/authcontext";
import { Post } from "@/types/post";

type BookmarkListener = () => void;
const listeners = new Set<BookmarkListener>();

function notifyBookmarkListeners() {
    listeners.forEach((listener) => {
        try {
            listener();
        } catch {}
    });
}

const memoryCache: Record<string, Post[]> = {};

export default function useBookmarks() {
    const { user } = useAuth();
    const storageKey = user?.id ? `circlehub_bookmarks_${user.id}` : null;

    const [bookmarks, setBookmarks] = useState<Post[]>(() => {
        if (storageKey && memoryCache[storageKey]) {
            return memoryCache[storageKey];
        }
        return [];
    });

    const loadBookmarks = useCallback(async () => {
        if (!storageKey) {
            setBookmarks([]);
            return;
        }

        try {
            const raw = await SecureStore.getItemAsync(storageKey);
            if (raw) {
                const parsed: Post[] = JSON.parse(raw);
                memoryCache[storageKey] = parsed;
                setBookmarks(parsed);
            } else {
                memoryCache[storageKey] = [];
                setBookmarks([]);
            }
        } catch {
            setBookmarks([]);
        }
    }, [storageKey]);

    useEffect(() => {
        loadBookmarks();
    }, [loadBookmarks]);

    useEffect(() => {
        const listener: BookmarkListener = () => {
            if (storageKey && memoryCache[storageKey]) {
                setBookmarks([...memoryCache[storageKey]]);
            } else {
                loadBookmarks();
            }
        };

        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, [storageKey, loadBookmarks]);

    const isBookmarked = useCallback(
        (postId: string) => bookmarks.some((p) => p.id === postId),
        [bookmarks]
    );

    const toggleBookmark = useCallback(
        async (post: Post) => {
            if (!storageKey || !post) return false;

            const current = memoryCache[storageKey] || bookmarks;
            const exists = current.some((p) => p.id === post.id);
            const updated = exists
                ? current.filter((p) => p.id !== post.id)
                : [post, ...current];

            memoryCache[storageKey] = updated;
            setBookmarks(updated);
            notifyBookmarkListeners();

            try {
                await SecureStore.setItemAsync(storageKey, JSON.stringify(updated));
            } catch {}

            return !exists;
        },
        [storageKey, bookmarks]
    );

    return {
        bookmarks,
        isBookmarked,
        toggleBookmark,
    };
}
