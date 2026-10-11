import { act, waitFor } from "@testing-library/react-native";

import {
    addPostComment,
    deleteCommunityPost,
    deletePost,
    deletePostComment,
    toggleLike,
    updatePost,
} from "@/api/posts";
import useAddComment from "@/hooks/mutations/useAddComment";
import useDeleteComment from "@/hooks/mutations/useDeleteComment";
import useDeletePost from "@/hooks/mutations/useDeletePost";
import useToggleLike from "@/hooks/mutations/useToggleLike";
import useUpdatePost from "@/hooks/mutations/useUpdatePost";
import { queryKeys } from "@/lib/queryKeys";
import { Post, PostDetails } from "@/types/post";

import {
    deferred,
    makeComment,
    makeCommunityDetails,
    makeFeed,
    makePost,
    makeSearchResults,
    makeUserProfile,
    renderHookWithQueryClient,
} from "../../test/helpers";

jest.mock("@/api/posts", () => ({
    toggleLike: jest.fn(),
    updatePost: jest.fn(),
    addPostComment: jest.fn(),
    deletePostComment: jest.fn(),
    deletePost: jest.fn(),
    deleteCommunityPost: jest.fn(),
}));

const mockToggleLike = jest.mocked(toggleLike);
const mockUpdatePost = jest.mocked(updatePost);
const mockAddPostComment = jest.mocked(addPostComment);
const mockDeletePostComment = jest.mocked(deletePostComment);
const mockDeletePost = jest.mocked(deletePost);
const mockDeleteCommunityPost = jest.mocked(deleteCommunityPost);

type Feed = ReturnType<typeof makeFeed>;

beforeEach(() => {
    jest.resetAllMocks();
});

describe("useToggleLike", () => {
    it("optimistically flips the like across every cached projection", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleLike()
        );

        const post = makePost({ id: "p1", likesCount: 3, isLikedByMe: false });

        queryClient.setQueryData(queryKeys.feed(), makeFeed([post]));
        queryClient.setQueryData<PostDetails>(queryKeys.post("p1"), {
            ...post,
            comments: [],
        });
        queryClient.setQueryData(queryKeys.userPosts("author"), [post]);
        queryClient.setQueryData(
            queryKeys.search("cats"),
            makeSearchResults({ posts: [post] })
        );

        const pending = deferred<{
            message: string;
            data: { postId: string; likesCount: number; isLikedByMe: boolean };
        }>();
        mockToggleLike.mockReturnValue(pending.promise);

        await act(() => {
            result.current.mutate("p1");
        });

        await waitFor(() => {
            expect(queryClient.getQueryData(queryKeys.post("p1"))).toMatchObject(
                { isLikedByMe: true, likesCount: 4 }
            );
        });

        const feed = queryClient.getQueryData<Feed>(queryKeys.feed());
        expect(feed?.pages[0].data[0]).toMatchObject({
            isLikedByMe: true,
            likesCount: 4,
        });

        const userPosts = queryClient.getQueryData<Post[]>(
            queryKeys.userPosts("author")
        );
        expect(userPosts?.[0]).toMatchObject({
            isLikedByMe: true,
            likesCount: 4,
        });

        const search = queryClient.getQueryData<{ posts: Post[] }>(
            queryKeys.search("cats")
        );
        expect(search?.posts[0]).toMatchObject({
            isLikedByMe: true,
            likesCount: 4,
        });

        await act(async () => {
            pending.resolve({
                message: "ok",
                data: { postId: "p1", likesCount: 4, isLikedByMe: true },
            });
        });
    });

    it("rolls every projection back when the request fails", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useToggleLike()
        );

        const post = makePost({ id: "p1", likesCount: 3, isLikedByMe: false });
        const feed = makeFeed([post]);

        queryClient.setQueryData(queryKeys.feed(), feed);
        queryClient.setQueryData(queryKeys.userPosts("author"), [post]);

        mockToggleLike.mockRejectedValue(new Error("network down"));

        await act(async () => {
            await expect(result.current.mutateAsync("p1")).rejects.toThrow(
                "network down"
            );
        });

        expect(queryClient.getQueryData(queryKeys.feed())).toEqual(feed);
        expect(queryClient.getQueryData(queryKeys.userPosts("author"))).toEqual([
            post,
        ]);
    });
});

describe("useDeletePost", () => {
    it("removes a standalone post and decrements the author's count", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDeletePost()
        );

        const target = makePost({ id: "p1" });
        const keep = makePost({ id: "p2" });

        queryClient.setQueryData(queryKeys.feed(), makeFeed([target, keep]));
        queryClient.setQueryData<PostDetails>(queryKeys.post("p1"), {
            ...target,
            comments: [],
        });
        queryClient.setQueryData(queryKeys.userPosts("author"), [target, keep]);
        queryClient.setQueryData(
            queryKeys.user("author"),
            makeUserProfile({ postsCount: 5 })
        );
        queryClient.setQueryData(queryKeys.communityPosts("c1"), [
            target,
            keep,
        ]);
        queryClient.setQueryData(
            queryKeys.search("q"),
            makeSearchResults({ posts: [target, keep] })
        );

        mockDeletePost.mockResolvedValue({ message: "deleted" });

        await act(async () => {
            await result.current.mutateAsync({ post: target });
        });

        expect(mockDeletePost).toHaveBeenCalledWith("p1");
        expect(mockDeleteCommunityPost).not.toHaveBeenCalled();

        const feed = queryClient.getQueryData<Feed>(queryKeys.feed());
        expect(feed?.pages[0].data.map((post) => post.id)).toEqual(["p2"]);

        expect(
            queryClient
                .getQueryData<Post[]>(queryKeys.userPosts("author"))
                ?.map((post) => post.id)
        ).toEqual(["p2"]);
        expect(
            queryClient
                .getQueryData<Post[]>(queryKeys.communityPosts("c1"))
                ?.map((post) => post.id)
        ).toEqual(["p2"]);
        expect(
            queryClient
                .getQueryData<{ posts: Post[] }>(queryKeys.search("q"))
                ?.posts.map((post) => post.id)
        ).toEqual(["p2"]);
        expect(
            queryClient.getQueryData(queryKeys.user("author"))
        ).toMatchObject({ postsCount: 4 });

        // The detail entry is dropped only after the server confirms.
        expect(queryClient.getQueryData(queryKeys.post("p1"))).toBeUndefined();
    });

    it("routes through the community endpoint and decrements the community count", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDeletePost()
        );

        const target = makePost({ id: "p1" });
        const community = { id: "c1", slug: "c" };

        queryClient.setQueryData(queryKeys.feed(), makeFeed([target]));
        queryClient.setQueryData(
            queryKeys.community("c"),
            makeCommunityDetails({ slug: "c", postsCount: 3 })
        );

        mockDeleteCommunityPost.mockResolvedValue({ message: "deleted" });

        await act(async () => {
            await result.current.mutateAsync({ post: target, community });
        });

        expect(mockDeleteCommunityPost).toHaveBeenCalledWith("c1", "p1");
        expect(mockDeletePost).not.toHaveBeenCalled();
        expect(
            queryClient.getQueryData(queryKeys.community("c"))
        ).toMatchObject({ postsCount: 2 });
    });

    it("restores the caches when deletion fails", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDeletePost()
        );

        const target = makePost({ id: "p1" });
        const feed = makeFeed([target]);

        queryClient.setQueryData(queryKeys.feed(), feed);
        queryClient.setQueryData(
            queryKeys.user("author"),
            makeUserProfile({ postsCount: 5 })
        );

        mockDeletePost.mockRejectedValue(new Error("forbidden"));

        await act(async () => {
            await expect(
                result.current.mutateAsync({ post: target })
            ).rejects.toThrow("forbidden");
        });

        expect(queryClient.getQueryData(queryKeys.feed())).toEqual(feed);
        expect(queryClient.getQueryData(queryKeys.user("author"))).toMatchObject(
            { postsCount: 5 }
        );
    });
});

describe("useUpdatePost", () => {
    it("merges the edited post into caches and keeps loaded comments", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useUpdatePost()
        );

        const original = makePost({ id: "p1", content: "before" });
        const updated = makePost({
            id: "p1",
            content: "after",
            likesCount: 9,
        });
        const comment = makeComment({ id: "c1" });

        queryClient.setQueryData<PostDetails>(queryKeys.post("p1"), {
            ...original,
            comments: [comment],
            commentsCount: 1,
        });
        queryClient.setQueryData(queryKeys.feed(), makeFeed([original]));
        queryClient.setQueryData(queryKeys.userPosts("author"), [original]);
        queryClient.setQueryData(
            queryKeys.search("q"),
            makeSearchResults({ posts: [original] })
        );

        mockUpdatePost.mockResolvedValue({ message: "updated", data: updated });

        await act(async () => {
            await result.current.mutateAsync({ postId: "p1", content: "after" });
        });

        const details = queryClient.getQueryData<PostDetails>(
            queryKeys.post("p1")
        );
        expect(details).toMatchObject({ content: "after", likesCount: 9 });
        expect(details?.comments).toEqual([comment]);

        const feed = queryClient.getQueryData<Feed>(queryKeys.feed());
        expect(feed?.pages[0].data[0]).toMatchObject({ content: "after" });

        expect(
            queryClient.getQueryData<Post[]>(queryKeys.userPosts("author"))?.[0]
        ).toMatchObject({ content: "after" });
        expect(
            queryClient.getQueryData<{ posts: Post[] }>(queryKeys.search("q"))
                ?.posts[0]
        ).toMatchObject({ content: "after" });
    });
});

describe("useAddComment", () => {
    it("prepends the comment and bumps the count everywhere", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useAddComment()
        );

        const post = makePost({ id: "p1", commentsCount: 1 });
        const existing = makeComment({ id: "c1" });
        const created = makeComment({ id: "c2", content: "fresh" });

        queryClient.setQueryData<PostDetails>(queryKeys.post("p1"), {
            ...post,
            comments: [existing],
        });
        queryClient.setQueryData(queryKeys.feed(), makeFeed([post]));
        queryClient.setQueryData(queryKeys.userPosts("author"), [post]);

        mockAddPostComment.mockResolvedValue({
            message: "added",
            data: { comment: created },
        });

        await act(async () => {
            await result.current.mutateAsync({ postId: "p1", content: "fresh" });
        });

        const details = queryClient.getQueryData<PostDetails>(
            queryKeys.post("p1")
        );
        expect(details?.comments.map((comment) => comment.id)).toEqual([
            "c2",
            "c1",
        ]);
        expect(details?.commentsCount).toBe(2);

        const feed = queryClient.getQueryData<Feed>(queryKeys.feed());
        expect(feed?.pages[0].data[0].commentsCount).toBe(2);
    });
});

describe("useDeleteComment", () => {
    it("optimistically removes the comment then keeps it removed on success", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDeleteComment()
        );

        const post = makePost({ id: "p1", commentsCount: 2 });
        const first = makeComment({ id: "c1" });
        const second = makeComment({ id: "c2" });

        queryClient.setQueryData<PostDetails>(queryKeys.post("p1"), {
            ...post,
            comments: [first, second],
        });
        queryClient.setQueryData(queryKeys.feed(), makeFeed([post]));

        const pending = deferred<{ message: string }>();
        mockDeletePostComment.mockReturnValue(pending.promise);

        await act(() => {
            result.current.mutate({ postId: "p1", commentId: "c1" });
        });

        await waitFor(() => {
            expect(
                queryClient.getQueryData<PostDetails>(queryKeys.post("p1"))
                    ?.comments
            ).toHaveLength(1);
        });

        const feed = queryClient.getQueryData<Feed>(queryKeys.feed());
        expect(feed?.pages[0].data[0].commentsCount).toBe(1);

        await act(async () => {
            pending.resolve({ message: "deleted" });
        });

        expect(
            queryClient.getQueryData<PostDetails>(queryKeys.post("p1"))
                ?.comments
        ).toHaveLength(1);
    });

    it("restores the comment and count when deletion fails", async () => {
        const { queryClient, result } = await renderHookWithQueryClient(() =>
            useDeleteComment()
        );

        const post = makePost({ id: "p1", commentsCount: 2 });
        const first = makeComment({ id: "c1" });
        const second = makeComment({ id: "c2" });

        queryClient.setQueryData<PostDetails>(queryKeys.post("p1"), {
            ...post,
            comments: [first, second],
        });
        queryClient.setQueryData(queryKeys.feed(), makeFeed([post]));

        const pending = deferred<{ message: string }>();
        mockDeletePostComment.mockReturnValue(pending.promise);

        await act(() => {
            result.current.mutate({ postId: "p1", commentId: "c1" });
        });

        await waitFor(() => {
            expect(
                queryClient.getQueryData<PostDetails>(queryKeys.post("p1"))
                    ?.comments
            ).toHaveLength(1);
        });

        await act(() => {
            pending.reject(new Error("boom"));
        });

        await waitFor(() => {
            const details = queryClient.getQueryData<PostDetails>(
                queryKeys.post("p1")
            );
            expect(details?.comments).toHaveLength(2);
            expect(details?.commentsCount).toBe(2);
        });

        const feed = queryClient.getQueryData<Feed>(queryKeys.feed());
        expect(feed?.pages[0].data[0].commentsCount).toBe(2);
    });
});
