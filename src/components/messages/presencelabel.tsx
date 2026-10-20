import { useEffect, useState } from "react";
import { Text } from "react-native";

import { useTheme } from "@/context/themecontext";
import { formatLastSeen } from "@/lib/formatRelativeTime";
import { themeColors } from "@/theme/colors";

const REFRESH_MS = 60_000;

export default function PresenceLabel({
    isOnline,
    lastSeenAt,
}: {
    isOnline?: boolean;
    lastSeenAt?: string | null;
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

    if (isOnline) {
        return (
            <Text
                numberOfLines={1}
                className="text-label-sm font-medium"
                style={{ color: colors.success }}
            >
                Online
            </Text>
        );
    }

    return (
        <Text
            numberOfLines={1}
            className="text-label-sm text-text-secondary"
        >
            {formatLastSeen(lastSeenAt) ?? "Offline"}
        </Text>
    );
}
