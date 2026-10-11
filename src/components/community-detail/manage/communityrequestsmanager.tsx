import { router } from "expo-router";
import { Check, X } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";

import Avatar from "@/components/avatar";
import GradientButton from "@/components/ui/gradientbutton";
import Skeleton from "@/components/ui/skeleton";
import { useTheme } from "@/context/themecontext";
import useDecideCommunityJoinRequest from "@/hooks/mutations/useDecideCommunityJoinRequest";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { CommunityDetails, CommunityJoinRequest } from "@/types/community";

function formatRequestDate(value: string) {
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function CommunityRequestsManager({
    community,
    requests,
    isLoading,
}: {
    community: CommunityDetails;
    requests: CommunityJoinRequest[];
    isLoading: boolean;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const decide = useDecideCommunityJoinRequest();

    function decideRequest(
        request: CommunityJoinRequest,
        decision: "approve" | "reject"
    ) {
        decide
            .mutateAsync({ community, request, decision })
            .catch((caught) => {
                Alert.alert(
                    decision === "approve"
                        ? "Could not accept request"
                        : "Could not reject request",
                    caught instanceof ApiError ? caught.message : "Please try again."
                );
            });
    }

    return (
        <View className="gap-4 rounded-2xl bg-surface-lowest p-4">
            <View>
                <Text className="text-title-lg font-semibold text-text-primary">
                    Pending Requests
                </Text>

                <Text className="mt-1 text-body-sm text-text-secondary">
                    Accept or reject people waiting to join this community.
                </Text>
            </View>

            {isLoading ? (
                <View className="gap-3">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                </View>
            ) : requests.length === 0 ? (
                <View className="items-center rounded-xl bg-surface-low px-4 py-10">
                    <Text className="text-title-lg text-text-primary">
                        No pending requests
                    </Text>

                    <Text className="mt-2 text-body-sm text-text-secondary">
                        New join requests will appear here.
                    </Text>
                </View>
            ) : (
                <View className="gap-3">
                    {requests.map((request) => {
                        const isDeciding =
                            decide.isPending &&
                            decide.variables?.request.id === request.id;

                        return (
                            <View
                                key={request.id}
                                className="gap-3 rounded-xl bg-surface-low p-3"
                            >
                                <Pressable
                                    onPress={() =>
                                        router.push({
                                            pathname: "/profile/[username]",
                                            params: {
                                                username: request.user.username,
                                            },
                                        })
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel={`View ${request.user.name}'s profile`}
                                    className="flex-row items-center gap-3"
                                >
                                    <Avatar
                                        src={request.user.avatarUrl}
                                        name={request.user.name}
                                        className="h-11 w-11"
                                    />

                                    <View className="min-w-0 flex-1">
                                        <Text
                                            numberOfLines={1}
                                            className="text-label-md text-text-primary"
                                        >
                                            {request.user.name}
                                        </Text>

                                        <Text
                                            numberOfLines={1}
                                            className="text-label-sm text-text-secondary"
                                        >
                                            {request.user.jobTitle
                                                ? `${request.user.jobTitle} • `
                                                : ""}
                                            {formatRequestDate(request.createdAt)}
                                        </Text>

                                        {request.note ? (
                                            <Text
                                                numberOfLines={2}
                                                className="mt-1 text-label-sm text-text-secondary"
                                            >
                                                {request.note}
                                            </Text>
                                        ) : null}
                                    </View>
                                </Pressable>

                                <View className="flex-row items-center gap-2">
                                    <GradientButton
                                        onPress={() =>
                                            decideRequest(request, "approve")
                                        }
                                        disabled={isDeciding}
                                        icon={
                                            <Check
                                                size={16}
                                                color={colors.buttonGradientText}
                                            />
                                        }
                                        label="Accept"
                                        className="flex-1 rounded-xl"
                                        contentStyle={{ paddingVertical: 10 }}
                                        textClassName="text-label-sm font-semibold"
                                    />

                                    <Pressable
                                        onPress={() =>
                                            decideRequest(request, "reject")
                                        }
                                        disabled={isDeciding}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Reject ${request.user.name}`}
                                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-surface-lowest py-2.5"
                                        style={
                                            isDeciding
                                                ? { opacity: 0.6 }
                                                : undefined
                                        }
                                    >
                                        <X
                                            size={16}
                                            color={colors.textSecondary}
                                        />
                                        <Text className="text-label-sm font-medium text-error">
                                            Reject
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}
