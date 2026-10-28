import { Check, UserPlus } from "lucide-react-native";
import { Pressable, Text } from "react-native";

import GradientButton from "@/components/ui/gradientbutton";
import { useTheme } from "@/context/themecontext";
import useToggleFollow from "@/hooks/mutations/useToggleFollow";
import { themeColors } from "@/theme/colors";

type FollowButtonUser = {
    id: string;
    name: string;
    username: string;
    isFollowedByMe: boolean;
    isCurrentUser: boolean;
};

export default function FollowButton({
    user,
    variant = "icon",
}: {
    user: FollowButtonUser;
    variant?: "icon" | "text";
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const toggleFollow = useToggleFollow();
    const isFollowing = user.isFollowedByMe;

    if (user.isCurrentUser) {
        return null;
    }

    function handlePress() {
        if (toggleFollow.isPending) return;

        toggleFollow.mutate({
            userId: user.id,
            shouldFollow: !isFollowing,
            targetUsername: user.username,
        });
    }

    const disabled = toggleFollow.isPending;

    if (variant === "text") {
        if (isFollowing) {
            return (
                <Pressable
                    onPress={handlePress}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Unfollow ${user.name}`}
                    className="flex-1 items-center justify-center rounded-full bg-active px-4 py-2"
                    style={[
                        { minHeight: 40 },
                        disabled ? { opacity: 0.6 } : undefined,
                    ]}
                >
                    <Text className="text-label-md font-semibold text-primary">
                        Following
                    </Text>
                </Pressable>
            );
        }

        return (
            <GradientButton
                onPress={handlePress}
                disabled={disabled}
                label="Follow"
                accessibilityLabel={`Follow ${user.name}`}
                className="flex-1 rounded-xl"
                contentStyle={{ minHeight: 40, paddingHorizontal: 16 }}
                textClassName="text-label-md font-semibold"
            />
        );
    }

    if (isFollowing) {
        return (
            <Pressable
                onPress={handlePress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Unfollow ${user.name}`}
                className="h-10 w-10 items-center justify-center rounded-full bg-active"
                style={disabled ? { opacity: 0.6 } : undefined}
            >
                <Check size={18} color={colors.primary} />
            </Pressable>
        );
    }

    return (
        <GradientButton
            onPress={handlePress}
            disabled={disabled}
            icon={<UserPlus size={18} color={colors.buttonGradientText} />}
            accessibilityLabel={`Follow ${user.name}`}
            className="h-10 w-10 rounded-full"
            contentStyle={{ flex: 1 }}
        />
    );
}
