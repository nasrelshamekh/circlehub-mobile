import { formatDistanceToNow } from "date-fns";
import { PostComment } from "@/types/post";

import { Text, View } from "react-native";

import Avatar from "@/components/avatar";

/**
 * A single comment bubble: avatar, author name, relative-style timestamp, and
 * the comment body. The timestamp matches the web app's comment rendering
 * (e.g. "5 minutes ago", "3 days ago").
 */
export default function CommentItem({ comment }: { comment: PostComment }) {
    return (
        <View className="flex-row gap-3">
            <Avatar
                src={comment.author.avatarUrl}
                name={comment.author.name}
                className="h-9 w-9"
            />

            <View className="flex-1 rounded-2xl bg-surface-low p-3">
                <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-label-md font-semibold text-text-primary">
                        {comment.author.name}
                    </Text>

                    <Text className="text-label-sm text-text-secondary">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                        })}
                    </Text>
                </View>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    {comment.content}
                </Text>
            </View>
        </View>
    );
}