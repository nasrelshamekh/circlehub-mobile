import { Text, View } from "react-native";

import CommentForm from "@/components/comment/commentform";
import CommentItem from "@/components/comment/commentitem";
import { PostDetails } from "@/types/post";

export default function CommentList({ post }: { post: PostDetails }) {
    const comments = post.comments ?? [];

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