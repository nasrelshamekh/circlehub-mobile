import { getPosts } from "@/api/posts";
import { Post } from "@/types/post";
import { useCallback, useState } from "react";

/**
 * Feed posts. This hook does not load on mount — the feed calls `refresh()` on
 * focus, which also performs the initial load (`loading` starts `true`).
 */
export default function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const response = await getPosts();

            setPosts(response.data);
            setError(null);
        } catch (caught) {
            setError("Failed to load posts");
            console.error(caught);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        posts,
        loading,
        error,
        refresh,
    };
}
