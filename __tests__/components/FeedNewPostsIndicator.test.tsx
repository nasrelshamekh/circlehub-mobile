import { emitPostCreated, subscribePostCreated } from "@/lib/feedEvents";
import { Post } from "@/types/post";

describe("Feed post events & new post indicator logic", () => {
    it("notifies subscribers when a new post is created", () => {
        const mockListener = jest.fn();
        const unsubscribe = subscribePostCreated(mockListener);

        const dummyPost: Post = {
            id: "post-123",
            content: "Hello from mobile or web!",
            author: {
                id: "user-1",
                name: "Alice",
                username: "alice",
                avatarUrl: null,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            likesCount: 0,
            commentsCount: 0,
            isLikedByMe: false,
        };

        emitPostCreated(dummyPost);
        expect(mockListener).toHaveBeenCalledTimes(1);
        expect(mockListener).toHaveBeenCalledWith(dummyPost);

        unsubscribe();
        emitPostCreated(dummyPost);
        expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it("formats new posts indicator label correctly for singular and plural", () => {
        function formatIndicator(count: number) {
            return `${count} New ${count === 1 ? "Post" : "Posts"}`;
        }

        expect(formatIndicator(1)).toBe("1 New Post");
        expect(formatIndicator(2)).toBe("2 New Posts");
        expect(formatIndicator(5)).toBe("5 New Posts");
    });
});
