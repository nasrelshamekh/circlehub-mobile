import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp, X } from "lucide-react-native";

import Avatar from "@/components/avatar";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

export interface InAppMessageNotificationProps {
    senderName: string;
    senderAvatarUrl?: string | null;
    messages: string[] | string;
    isExpanded?: boolean;
    defaultExpanded?: boolean;
    onToggleExpand?: (isExpanded: boolean) => void;
    onPress?: () => void;
    onDismiss?: () => void;
    className?: string;
    testID?: string;
}

export default function InAppMessageNotification({
    senderName,
    senderAvatarUrl,
    messages,
    isExpanded: controlledExpanded,
    defaultExpanded = false,
    onToggleExpand,
    onPress,
    onDismiss,
    className = "",
    testID = "in-app-message-notification",
}: InAppMessageNotificationProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

    const isExpanded =
        controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

    const messageList = Array.isArray(messages)
        ? messages.filter((m) => typeof m === "string" && m.trim().length > 0)
        : typeof messages === "string" && messages.trim().length > 0
          ? messages.split("\n").filter((m) => m.trim().length > 0)
          : [];

    const latestMessage =
        messageList.length > 0 ? messageList[messageList.length - 1] : "";

    function handleToggle(e: any) {
        e?.stopPropagation?.();
        const next = !isExpanded;
        if (controlledExpanded === undefined) {
            setInternalExpanded(next);
        }
        onToggleExpand?.(next);
    }

    function handleDismiss(e: any) {
        e?.stopPropagation?.();
        onDismiss?.();
    }

    return (
        <View
            testID={testID}
            accessibilityRole="alert"
            className={`rounded-2xl border border-border bg-surface-lowest shadow-lg overflow-hidden ${className}`}
        >
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={`Message notification from ${senderName}`}
                className="flex-row items-start p-3.5 gap-3"
            >
                {/* Left: Circular Avatar with graceful missing avatar fallback */}
                <View className="shrink-0 pt-0.5">
                    <Avatar
                        src={senderAvatarUrl}
                        name={senderName}
                        className="h-10 w-10"
                        textClassName="text-label-md font-bold"
                    />
                </View>

                {/* Center / Body: Sender Name + Grouped Messages */}
                <View className="min-w-0 flex-1">
                    {/* Top Header: Sender Name + message count pill */}
                    <View className="flex-row items-center gap-2">
                        <Text
                            numberOfLines={1}
                            className="text-label-md font-semibold text-text-primary flex-1"
                            testID={`${testID}-sender-name`}
                        >
                            {senderName}
                        </Text>

                        {messageList.length > 1 && (
                            <View
                                className="rounded-full bg-surface-medium px-2 py-0.5"
                                testID={`${testID}-count-badge`}
                            >
                                <Text className="text-label-xs font-medium text-text-secondary">
                                    {messageList.length} messages
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Messages Container */}
                    {isExpanded ? (
                        /* Expanded State: Vertically grouped messages without repeating sender identity */
                        <View
                            className="mt-1.5 gap-1.5"
                            testID={`${testID}-expanded-messages`}
                        >
                            {messageList.map((msg, index) => (
                                <View
                                    key={index}
                                    className={
                                        index > 0
                                            ? "pt-1.5 border-t border-border/40"
                                            : ""
                                    }
                                    testID={`${testID}-message-item-${index}`}
                                >
                                    <Text className="text-body-sm text-text-primary leading-snug">
                                        {msg}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        /* Collapsed State: Single compact preview line of latest message */
                        <Text
                            numberOfLines={1}
                            className="text-body-sm text-text-secondary mt-0.5"
                            testID={`${testID}-collapsed-preview`}
                        >
                            {latestMessage}
                        </Text>
                    )}
                </View>

                {/* Right: Expand / Collapse Toggle & Dismiss Button */}
                <View className="flex-row items-center gap-1 shrink-0 pt-0.5">
                    <Pressable
                        onPress={handleToggle}
                        accessibilityRole="button"
                        accessibilityLabel={
                            isExpanded
                                ? "Collapse notification"
                                : "Expand notification"
                        }
                        accessibilityState={{ expanded: isExpanded }}
                        hitSlop={12}
                        className="h-7 w-7 items-center justify-center rounded-full active:bg-surface-high"
                        testID={`${testID}-toggle-button`}
                    >
                        {isExpanded ? (
                            <ChevronUp size={18} color={colors.textSecondary} />
                        ) : (
                            <ChevronDown size={18} color={colors.textSecondary} />
                        )}
                    </Pressable>

                    {onDismiss && (
                        <Pressable
                            onPress={handleDismiss}
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss notification"
                            hitSlop={12}
                            className="h-7 w-7 items-center justify-center rounded-full active:bg-surface-high"
                            testID={`${testID}-dismiss-button`}
                        >
                            <X size={16} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>
            </Pressable>
        </View>
    );
}
