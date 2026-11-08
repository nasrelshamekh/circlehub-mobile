import { useMemo } from "react";
import { Text, View } from "react-native";

import CommentForm from "@/components/comment/commentform";
import CommentItem from "@/components/comment/commentitem";
import { PostComment, PostDetails } from "@/types/post";

function nestComments(flatComments: PostComment[]): PostComment[] {
    if (!flatComments || flatComments.length === 0) return [];
    if (!flatComments.some((c) => Boolean(c.parentCommentId))) {
        return flatComments;
    }
    const map = new Map<string, PostComment>();
    flatComments.forEach((c) => {
        map.set(c.id, { ...c, replies: c.replies ? [...c.replies] : [] });
    });
    const roots: PostComment[] = [];
    flatComments.forEach((c) => {
        const item = map.get(c.id)!;
        if (c.parentCommentId && map.has(c.parentCommentId)) {
            const parent = map.get(c.parentCommentId)!;
            if (!parent.replies?.some((r) => r.id === item.id)) {
                parent.replies = [...(parent.replies || []), item];
            }
        } else {
            roots.push(item);
        }
    });
    return roots.length > 0 ? roots : flatComments;
}

export default function CommentList({ post }: { post: PostDetails }) {
    const comments = useMemo(
        () => nestComments(post.comments ?? []),
        [post.comments]
    );

    return (
        <View className="my-2 rounded-lg bg-surface-lowest p-5 gap-4">
            <Text className="text-title-lg font-semibold text-text-primary">
                Comments
            </Text>

            <CommentForm postId={post.id} />

            {comments.length > 0 ? (
                <View className="gap-4">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            postId={post.id}
                            comment={comment}
                        />
                    ))}
                </View>
            ) : (
                <Text className="text-body-sm text-text-secondary">
                    No comments yet. Be the first to comment.
                </Text>
            )}
        </View>
    );
}