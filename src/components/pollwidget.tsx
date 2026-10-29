import { Check, Clock, LoaderCircle, BarChart2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import useVotePoll from "@/hooks/mutations/useVotePoll";
import { themeColors } from "@/theme/colors";
import { Poll } from "@/types/post";

interface PollWidgetProps {
    postId: string;
    poll: Poll;
}

export default function PollWidget({ postId, poll }: PollWidgetProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const voteMutation = useVotePoll();
    const [isChangingVote, setIsChangingVote] = useState(false);
    const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

    const [currentTime] = useState(() => Date.now());

    if (!poll || !poll.options) return null;

    const isExpired =
        Boolean(poll.expiresAt) && new Date(poll.expiresAt!).getTime() < currentTime;
    const hasVoted = Boolean(poll.myVotedOptionId);
    const showResults = hasVoted && !isChangingVote;
    const totalVotes = poll.totalVotes ?? 0;

    function formatRemainingTime(expiresAt?: string) {
        if (!expiresAt) return null;
        const diff = new Date(expiresAt).getTime() - currentTime;
        if (diff <= 0) return "Poll ended";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d left`;
        if (hours > 0) return `${hours}h left`;
        const minutes = Math.floor(diff / (1000 * 60));
        return `${Math.max(1, minutes)}m left`;
    }

    async function handleVote(optionId: string) {
        if (isExpired || voteMutation.isPending) return;
        setVotingOptionId(optionId);
        try {
            await voteMutation.mutateAsync({ postId, optionId });
            setIsChangingVote(false);
        } catch {
            // Error is handled in mutation or user can retry
        } finally {
            setVotingOptionId(null);
        }
    }

    return (
        <View className="my-2.5 rounded-2xl bg-surface-low p-4">
            {/* Header chip */}
            <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1">
                    <BarChart2 size={13} color={colors.primary} />
                    <Text className="text-label-xs font-semibold text-primary">
                        Community Poll
                    </Text>
                </View>
                {poll.expiresAt ? (
                    <View className="flex-row items-center gap-1">
                        <Clock size={12} color={colors.textSecondary} />
                        <Text className="text-label-xs text-text-secondary font-medium">
                            {formatRemainingTime()}
                        </Text>
                    </View>
                ) : null}
            </View>

            {poll.question ? (
                <Text className="mb-1 text-label-lg font-bold text-text-primary">
                    {poll.question}
                </Text>
            ) : null}

            {!showResults && !isExpired && (
                <Text className="mb-3 text-label-xs text-text-secondary">
                    Select an option to cast your vote:
                </Text>
            )}

            <View className="gap-2.5">
                {poll.options.map((option) => {
                    const isMyVote = poll.myVotedOptionId === option.id;
                    const percent = Math.round(option.percentage ?? 0);
                    const isPendingThis =
                        voteMutation.isPending && votingOptionId === option.id;

                    if (showResults || isExpired) {
                        return (
                            <View
                                key={option.id}
                                className={`relative overflow-hidden rounded-xl p-3.5 bg-surface-lowest border ${
                                    isMyVote
                                        ? "border-primary"
                                        : "border-border/30"
                                }`}
                            >
                                {/* Progress Bar Fill */}
                                <View
                                    style={{
                                        width: `${percent}%`,
                                    }}
                                    className={`absolute bottom-0 left-0 top-0 opacity-20 ${
                                        isMyVote ? "bg-primary" : "bg-text-secondary"
                                    }`}
                                />

                                <View className="flex-row items-center justify-between z-10">
                                    <View className="flex-1 flex-row items-center gap-2 pr-2">
                                        {isMyVote && (
                                            <View
                                                style={{ backgroundColor: colors.primary }}
                                                className="h-5 w-5 items-center justify-center rounded-full"
                                            >
                                                <Check
                                                    size={12}
                                                    color={colors.buttonGradientText}
                                                    strokeWidth={3}
                                                />
                                            </View>
                                        )}
                                        <Text
                                            className={`text-body-sm ${
                                                isMyVote
                                                    ? "font-bold text-text-primary"
                                                    : "text-text-primary"
                                            }`}
                                            numberOfLines={2}
                                        >
                                            {option.text}
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center gap-1.5">
                                        <Text className={`text-label-sm font-bold ${
                                            isMyVote ? "text-primary" : "text-text-primary"
                                        }`}>
                                            {percent}%
                                        </Text>
                                        <Text className="text-label-xs text-text-secondary">
                                            ({option.votesCount})
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    }

                    // Interactive voting option button
                    return (
                        <Pressable
                            key={option.id}
                            onPress={() => handleVote(option.id)}
                            disabled={voteMutation.isPending}
                            accessibilityRole="button"
                            accessibilityLabel={`Vote for ${option.text}`}
                            className="flex-row items-center justify-between rounded-xl px-4 py-3.5 bg-surface-lowest active:bg-surface-high border border-border/40"
                        >
                            <Text
                                className="flex-1 text-body-sm font-medium pr-3 text-text-primary"
                                numberOfLines={2}
                            >
                                {option.text}
                            </Text>

                            {isPendingThis ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <View
                                    className={`h-5 w-5 items-center justify-center rounded-full border ${
                                        isMyVote
                                            ? "border-primary bg-primary"
                                            : "border-border bg-surface-lowest"
                                    }`}
                                >
                                    {isMyVote && (
                                        <View
                                            style={{ backgroundColor: colors.buttonGradientText }}
                                            className="h-2 w-2 rounded-full"
                                        />
                                    )}
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </View>

            {/* Footer with stats & action */}
            <View className="mt-3.5 flex-row items-center justify-between pt-1">
                <View className="flex-row items-center gap-3">
                    <Text className="text-label-xs text-text-secondary">
                        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                    </Text>

                    {poll.expiresAt && (
                        <View className="flex-row items-center gap-1">
                            <Clock size={12} color={colors.textSecondary} />
                            <Text className="text-label-xs text-text-secondary">
                                {formatRemainingTime(poll.expiresAt)}
                            </Text>
                        </View>
                    )}
                </View>

                {!isExpired && hasVoted && (
                    <Pressable
                        onPress={() => setIsChangingVote((prev) => !prev)}
                        accessibilityRole="button"
                        className="rounded-lg bg-surface-low px-2.5 py-1 active:bg-surface-high"
                    >
                        <Text className="text-label-xs font-semibold text-primary">
                            {isChangingVote ? "Cancel" : "Change vote"}
                        </Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}
