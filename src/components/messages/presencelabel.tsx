import { useEffect, useState } from "react";
import { Text } from "react-native";

import { useTheme } from "@/context/themecontext";
import { formatLastSeen } from "@/lib/formatRelativeTime";
import { themeColors } from "@/theme/colors";

const REFRESH_MS = 60_000;

export default function PresenceLabel({
    isOnline,
    lastSeenAt,
    isTyping,
    className,
}: {
    isOnline?: boolean;
    lastSeenAt?: string | null;
    isTyping?: boolean;
    className?: string;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const [, setTick] = useState(0);

    useEffect(() => {
        if (isOnline || !lastSeenAt) return undefined;

        const timer = setInterval(() => {
            setTick((t) => t + 1);
        }, REFRESH_MS);

        return () => clearInterval(timer);
    }, [isOnline, lastSeenAt]);

    if (isTyping) {
        return (
            <Text
                numberOfLines={1}
                className={className ?? "text-label-sm font-medium"}
                style={{ color: colors.primary }}
            >
                Typing…
            </Text>
        );
    }

    if (isOnline) {
        return (
            <Text
                numberOfLines={1}
                className={className ?? "text-label-sm font-medium"}
                style={{ color: colors.success }}
            >
                Online
            </Text>
        );
    }

    // Only display Offline / last seen when presence status is actually known
    if (isOnline === false) {
        return (
            <Text
                numberOfLines={1}
                className={className ?? "text-label-sm text-text-secondary"}
            >
                {formatLastSeen(lastSeenAt) ?? "Offline"}
            </Text>
        );
    }

    // isOnline is undefined (presence still resolving / loading) — avoid flashing "Offline"
    return null;
}
