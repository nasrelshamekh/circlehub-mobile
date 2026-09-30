import { getPosts } from "@/api/posts";
import { Post } from "@/types/post";
import { useEffect, useState } from "react";

export default function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPosts() {
            try {
                setLoading(true);
                setError(null);

                const response = await getPosts();

                setPosts(response.data);
            } catch (error) {
                setError("Failed to load posts");
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchPosts();
    }, []);

    return {
        posts,
        loading,
        error,
    };
}