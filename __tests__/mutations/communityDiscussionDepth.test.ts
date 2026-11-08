import { act, waitFor } from "@testing-library/react-native";

import {
    addPostComment,
    toggleCommentLike,
    togglePinPost,
} from "@/api/posts";
import useAddComment from "@/hooks/mutations/useAddComment";
import useToggleCommentLike from "@/hooks/mutations/useToggleCommentLike";
import useTogglePinPost from "@/hooks/mutations/useTogglePinPost";
import { queryKeys } from "@/lib/queryKeys";
import { PostComment, PostDetails } from "@/types/post";

import {
    deferred,
    makeComment,
    makePost,
    renderHookWithQueryClient,
} from "../../test/helpers";

jest.mock("@/api/posts", () => ({
    addPostComment: jest.fn(),
    toggleCommentLike: jest.fn(),
    togglePinPost: jest.fn(),
}));

const mockAddPostComment = jest.mocked(addPostComment);
const mockToggleCommentLike = jest.mocked(toggleCommentLike);
const mockTogglePinPost = jest.mocked(togglePinPost);

beforeEach(() => {
    jest.resetAllMocks();
});

describe("Community Discussion Depth: Threaded Comments", () => {
    test("inserts nested reply into parent comment thread", async () => {
        const post = makePost({ id: "p-1" });
        const parentComment = makeComment({ id: "c-1" });
        const postDetails: PostDetails = {
            ...post,
            comments: [parentComment],
            commentsCount: 1,
        };

        const { result, queryClient } = await renderHookWithQueryClient(() => useAddComment());
        queryClient.setQueryData(queryKeys.post("p-1"), postDetails);

        const replyComment: PostComment = {
            id: "reply-1",
            content: "Replying to parent",
            createdAt: new Date().toISOString(),
            author: parentComment.author,
            parentCommentId: "c-1",
            parentAuthorName: parentComment.author.name,
        };

        mockAddPostComment.mockResolvedValueOnce({
            message: "Comment added",
            data: { comment: replyComment },
        });

        await act(async () => {
            await result.current.mutateAsync({
                postId: "p-1",
                content: "Replying to parent",
                parentCommentId: "c-1",
            });
        });

        const cached = queryClient.getQueryData<PostDetails>(queryKeys.post("p-1"));
        expect(cached?.commentsCount).toBe(2);
        expect(cached?.comments[0].replies).toBeDefined();
        expect(cached?.comments[0].replies?.length).toBe(1);
        expect(cached?.comments[0].replies?.[0].id).toBe("reply-1");
    });
});

describe("Community Discussion Depth: Comment Likes", () => {
    test("optimistically toggles comment like on and increments count", async () => {
        const post = makePost({ id: "p-1" });
        const comment: PostComment = {
            ...makeComment({ id: "c-1" }),
            likesCount: 0,
            isLiked: false,
        };
        const postDetails: PostDetails = {
            ...post,
            comments: [comment],
        };

        const pending = deferred<{
            message: string;
            data: { commentId: string; postId: string; isLiked: boolean; likesCount: number };
        }>();
        mockToggleCommentLike.mockReturnValue(pending.promise);

        const { result, queryClient } = await renderHookWithQueryClient(() =>
            useToggleCommentLike()
        );
        queryClient.setQueryData(queryKeys.post("p-1"), postDetails);

        await act(async () => {
            result.current.mutate({ postId: "p-1", commentId: "c-1" });
        });

        // Wait for optimistic update
        await waitFor(() => {
            const cached = queryClient.getQueryData<PostDetails>(queryKeys.post("p-1"));
            expect(cached?.comments[0].isLiked).toBe(true);
            expect(cached?.comments[0].likesCount).toBe(1);
        });

        // Resolve API
        await act(async () => {
            pending.resolve({
                message: "Comment liked",
                data: { commentId: "c-1", postId: "p-1", isLiked: true, likesCount: 1 },
            });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const finalCached = queryClient.getQueryData<PostDetails>(queryKeys.post("p-1"));
        expect(finalCached?.comments[0].isLiked).toBe(true);
        expect(finalCached?.comments[0].likesCount).toBe(1);
    });
});

describe("Community Discussion Depth: Pinned Community Posts", () => {
    test("toggles pin status and invalidates community queries", async () => {
        const { result, queryClient } = await renderHookWithQueryClient(() =>
            useTogglePinPost()
        );

        mockTogglePinPost.mockResolvedValueOnce({
            message: "Post pinned to community",
            data: { postId: "p-1", isPinned: true, pinnedAt: new Date().toISOString() },
        });

        const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

        await act(async () => {
            await result.current.mutateAsync({ postId: "p-1", communityId: "comm-1" });
        });

        expect(mockTogglePinPost).toHaveBeenCalledWith("p-1");
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.post("p-1") });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.communityPosts("comm-1") });
    });
});
