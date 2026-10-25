import { Post } from "@/types/post";

type PostCreatedListener = (post: Post) => void;
const postCreatedListeners = new Set<PostCreatedListener>();

export function emitPostCreated(post: Post): void {
    postCreatedListeners.forEach((listener) => {
        try {
            listener(post);
        } catch (e) {
            console.error("Error in postCreated listener:", e);
        }
    });
}

export function subscribePostCreated(listener: PostCreatedListener): () => void {
    postCreatedListeners.add(listener);
    return () => {
        postCreatedListeners.delete(listener);
    };
}
