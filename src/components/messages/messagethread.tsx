import * as Clipboard from "expo-clipboard";
import { AlertCircle, Ban, Check, CheckCheck, RotateCcw, Send, Smile, Trash2 } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import Avatar from "@/components/avatar";
import EmojiPicker from "@/components/messages/emojipicker";
import GifPicker from "@/components/common/gifpicker";
import MediaLightbox from "@/components/common/medialightbox";
import SharedPostCard from "@/components/messages/sharedpostcard";
import MessageThreadSkeleton from "@/components/skeletons/messagethreadskeleton";
import ConfirmModal from "@/components/ui/confirmmodal";
import {
    FadeSlideIn,
    MOTION,
    TypingDot,
} from "@/components/ui/motion";
import { useAuth } from "@/context/authcontext";
import { useTheme } from "@/context/themecontext";
import useSendMessage from "@/hooks/mutations/useSendMessage";
import { useDecryptedContent } from "@/hooks/useDecryptedContent";
import { useTypingBroadcast } from "@/hooks/useTypingBroadcast";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { formatMessageDate, formatMessageTime } from "@/lib/formatPostDate";
import { haptics } from "@/lib/haptics";
import { MAX_PLAINTEXT_LENGTH, peekDecrypted } from "@/services/messageCrypto";
import { GifItem, parseGifContent } from "@/services/gifService";
import { Image as ExpoImage } from "expo-image";
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { Message } from "@/types/message";
import { useQueryClient } from "@tanstack/react-query";
import { deleteMessage, setMessageReaction } from "@/api/messages";
import { removeMessageFromThreadCache, updateMessageReactionsInThreadCache } from "@/lib/messageCacheHelpers";

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const COUNTER_SHOW_THRESHOLD = 2500;
const COUNTER_WARN_THRESHOLD = 3800;

function DateDivider({ value }: { value: string }) {
    return (
        <View className="mb-3 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />

            <Text className="text-label-sm text-text-secondary">
                {formatMessageDate(value)}
            </Text>

            <View className="h-px flex-1 bg-border" />
        </View>
    );
}

function isNewDay(current: string, previous?: string) {
    if (!previous) return true;

    const currentDate = new Date(current);
    const previousDate = new Date(previous);

    return (
        currentDate.getFullYear() !== previousDate.getFullYear() ||
        currentDate.getMonth() !== previousDate.getMonth() ||
        currentDate.getDate() !== previousDate.getDate()
    );
}

const MessageBubble = memo(function MessageBubble({
    message,
    otherUserLastReadAt,
    onRetry,
    isRetrying,
    onReaction,
    onDeleteMessage,
    onOpenMedia,
}: {
    message: Message;
    otherUserLastReadAt?: string | null;
    onRetry?: (message: Message) => void;
    isRetrying?: boolean;
    onReaction?: (messageId: string, emoji: string) => void;
    onDeleteMessage?: (message: Message) => void;
    onOpenMedia?: (uri: string) => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const isMine = message.isMine;
    const isPending = Boolean(message.pending);
    const isFailed = Boolean(message.failed);
    const hasContent = Boolean(
        (message.content && message.content.length > 0) || message.plaintext
    );

    let deliveryState: "sent" | "delivered" | "seen" | "failed" | null = null;
    if (isMine) {
        if (isFailed) {
            deliveryState = "failed";
        } else if (isPending) {
            deliveryState = null;
        } else if (message.deliveryStatus === "sent") {
            deliveryState = "sent";
        } else {
            const readAt = otherUserLastReadAt
                ? new Date(otherUserLastReadAt).getTime()
                : 0;
            const msgTime = message.createdAt
                ? new Date(message.createdAt).getTime()
                : 0;
            if (readAt && msgTime && msgTime <= readAt) {
                deliveryState = "seen";
            } else {
                deliveryState = "delivered";
            }
        }
    }
    const cachedPlaintext = message.plaintext ?? peekDecrypted(message.content);
    const { text: decryptedText, isPending: isDecrypting } =
        useDecryptedContent(cachedPlaintext ? null : message.content);

    const displayText = cachedPlaintext ?? decryptedText;
    const isActuallyDecrypting = !cachedPlaintext && isDecrypting && !isMine;
    const { text, gifUrl } = useMemo(
        () => parseGifContent(displayText),
        [displayText]
    );

    const [isExpanded, setIsExpanded] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [pickerY, setPickerY] = useState<number>(200);
    const bubbleContainerRef = useRef<View>(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!isCopied) return;

        const timeout = setTimeout(() => setIsCopied(false), 1500);

        return () => clearTimeout(timeout);
    }, [isCopied]);

    const handleLongPress = useCallback(() => {
        if (isPending || isFailed || !onReaction) return;
        haptics.medium();
        if (
            bubbleContainerRef.current &&
            typeof bubbleContainerRef.current.measureInWindow === "function"
        ) {
            bubbleContainerRef.current.measureInWindow((_x, y, _width, height) => {
                const targetY = y > 110 ? y - 56 : y + height + 10;
                setPickerY(targetY);
                setShowReactionPicker(true);
            });
        } else {
            setPickerY(200);
            setShowReactionPicker(true);
        }
    }, [isPending, isFailed, onReaction]);

    async function handleCopy() {
        if (!displayText) return;

        await Clipboard.setStringAsync(displayText);
        setIsCopied(true);
    }

    const isDeleted = Boolean(
        message.isDeleted || (!message.content && !message.postId && !message.plaintext)
    );

    if (isDeleted) {
        return (
            <View ref={bubbleContainerRef} collapsable={false}>
                <Pressable
                    onPress={() => setIsExpanded((expanded) => !expanded)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    className={
                        isMine
                            ? "mb-3 flex-col items-end"
                            : "mb-3 flex-col items-start"
                    }
                >
                    <View
                        className={
                            isMine
                                ? "flex-row items-end justify-end gap-2"
                                : "flex-row items-end gap-2"
                        }
                    >
                        {!isMine && (
                            <Avatar
                                src={message.sender.avatarUrl}
                                name={message.sender.name}
                                className="h-8 w-8"
                                textClassName="text-label-sm"
                            />
                        )}

                        <View
                            className={
                                isMine ? "max-w-[78%] items-end" : "max-w-[78%]"
                            }
                        >
                            <View
                                className={
                                    isMine
                                        ? "flex-row items-center gap-2 rounded-2xl rounded-br-md border border-border/60 bg-surface-lowest px-4 py-2.5"
                                        : "flex-row items-center gap-2 rounded-2xl rounded-bl-md border border-border/60 bg-surface-lowest px-4 py-2.5"
                                }
                            >
                                <Ban size={14} color={colors.textSecondary} />
                                <Text className="text-body-sm italic text-text-secondary">
                                    Message has been deleted
                                </Text>
                            </View>
                        </View>
                    </View>

                    {isExpanded && (
                        <View
                            className={
                                isMine
                                    ? "mt-1 flex-row flex-wrap items-center gap-3"
                                    : "mt-1 flex-row flex-wrap items-center gap-3 pl-10"
                            }
                        >
                            <Text className="text-label-sm text-text-secondary">
                                {formatMessageTime(message.createdAt)}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>
        );
    }

    return (
        <FadeSlideIn
            duration={0}
            from={0}
        >
            <View
                ref={bubbleContainerRef}
                collapsable={false}
                style={{ opacity: isPending ? 0.6 : 1 }}
            >
                <Pressable
                    onPress={() => setIsExpanded((expanded) => !expanded)}
                    onLongPress={handleLongPress}
                    delayLongPress={280}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    accessibilityHint="Shows when the message was sent or opens reaction bar on long press"
                    className={
                        isMine
                            ? "mb-3 flex-col items-end"
                            : "mb-3 flex-col items-start"
                    }
                >
            <View
                className={
                    isMine
                        ? "flex-row items-end justify-end gap-2"
                        : "flex-row items-end gap-2"
                }
            >
                {!isMine && (
                    <Avatar
                        src={message.sender.avatarUrl}
                        name={message.sender.name}
                        className="h-8 w-8"
                        textClassName="text-label-sm"
                    />
                )}

                <View
                    className={
                        isMine ? "max-w-[78%] items-end" : "max-w-[78%]"
                    }
                >
                    {hasContent && (
                        <View className={isMine ? "items-end gap-1.5" : "items-start gap-1.5"}>
                            {isActuallyDecrypting && !displayText ? (
                                <View
                                    className={
                                        isMine
                                            ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5"
                                            : "rounded-2xl rounded-bl-md bg-surface-lowest px-4 py-2.5"
                                    }
                                >
                                    <View
                                        accessibilityLabel="Loading message"
                                        className="gap-1.5"
                                    >
                                        <View className="h-3 w-28 rounded-full bg-surface-high" />
                                        <View className="h-3 w-16 rounded-full bg-surface-high" />
                                    </View>
                                </View>
                            ) : (
                                <>
                                    {Boolean(text) && (
                                        <View
                                            style={isPending ? { opacity: 0.65 } : undefined}
                                            className={
                                                isMine
                                                    ? isFailed
                                                        ? "rounded-2xl rounded-br-md border border-error bg-primary px-4 py-2.5"
                                                        : isPending
                                                        ? "rounded-2xl rounded-br-md bg-primary opacity-60 px-4 py-2.5"
                                                        : "rounded-2xl rounded-br-md bg-primary px-4 py-2.5"
                                                    : "rounded-2xl rounded-bl-md bg-surface-lowest px-4 py-2.5"
                                            }
                                        >
                                            <Text
                                                className={
                                                    isMine
                                                        ? "text-body-sm text-on-primary"
                                                        : "text-body-sm text-text-primary"
                                                }
                                            >
                                                {text}
                                            </Text>
                                        </View>
                                    )}

                                    {Boolean(gifUrl) && (
                                        <Pressable
                                            onPress={() => onOpenMedia?.(gifUrl!)}
                                            accessibilityRole="button"
                                            accessibilityLabel="View GIF"
                                            className="overflow-hidden rounded-2xl border border-border bg-surface-lowest"
                                            style={[{ width: 220, height: 160 }, isPending ? { opacity: 0.65 } : undefined]}
                                        >
                                            <ExpoImage
                                                source={{ uri: gifUrl! }}
                                                style={{ width: "100%", height: "100%" }}
                                                contentFit="cover"
                                                transition={150}
                                            />
                                            <View className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5">
                                                <Text className="text-[9px] font-bold text-white tracking-wider">
                                                    GIF
                                                </Text>
                                            </View>
                                        </Pressable>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {message.postId && <SharedPostCard post={message.post} />}
                </View>

            </View>

            {/* Reaction Badges placed directly under the bubble row to push the next message downwards */}
            {message.reactions && message.reactions.length > 0 && (
                <View
                    className={
                        isMine
                            ? "mt-1 flex-row flex-wrap items-center justify-end gap-1 pr-1"
                            : "mt-1 flex-row flex-wrap items-center gap-1 pl-10"
                    }
                >
                    {message.reactions.map((reaction) => (
                        <Pressable
                            key={reaction.emoji}
                            onPress={() => {
                                haptics.selection();
                                onReaction?.(message.id, reaction.emoji);
                            }}
                            hitSlop={4}
                            className={
                                reaction.reactedByMe
                                    ? "flex-row items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5"
                                    : "flex-row items-center gap-1 rounded-full bg-surface-lowest px-2 py-0.5"
                            }
                        >
                            <Text className="text-xs">{reaction.emoji}</Text>
                            <Text
                                className={
                                    reaction.reactedByMe
                                        ? "text-[11px] font-semibold text-primary"
                                        : "text-[11px] font-medium text-text-secondary"
                                }
                            >
                                {reaction.count}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {isFailed && (
                <View
                    className={
                        isMine
                            ? "mt-1 flex-row items-center gap-1.5"
                            : "mt-1 flex-row items-center gap-1.5 pl-10"
                    }
                >
                    <Pressable
                        onPress={() => onRetry?.(message)}
                        disabled={isRetrying}
                        accessibilityRole="button"
                        accessibilityLabel="Retry failed message"
                        accessibilityState={{ disabled: Boolean(isRetrying) }}
                        hitSlop={6}
                        className="flex-row items-center gap-1.5"
                    >
                        <AlertCircle size={13} color={colors.error} />
                        <Text className="text-label-sm text-error">
                            Failed to send
                        </Text>

                        {onRetry && (
                            isRetrying ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <View className="ml-0.5 flex-row items-center gap-1">
                                    <RotateCcw size={12} color={colors.primary} />
                                    <Text className="text-label-sm font-semibold text-primary">
                                        Retry
                                    </Text>
                                </View>
                            )
                        )}
                    </Pressable>
                </View>
            )}

            {isMine && !isFailed && !isExpanded && deliveryState && (
                <View
                    testID={`message-status-${deliveryState}`}
                    accessibilityLabel={
                        deliveryState === "seen"
                            ? "Seen"
                            : deliveryState === "delivered"
                            ? "Delivered"
                            : "Sent"
                    }
                    className="mt-0.5 flex-row items-center justify-end pr-0.5"
                >
                    {deliveryState === "seen" && (
                        <CheckCheck size={14} color="#0284c7" />
                    )}
                    {deliveryState === "delivered" && (
                        <CheckCheck size={14} color={colors.primary} />
                    )}
                    {deliveryState === "sent" && (
                        <Check size={12} color={colors.textSecondary} />
                    )}
                </View>
            )}

            {isExpanded && !isFailed && (
                <View
                    className={
                        isMine
                            ? "mt-1 flex-row flex-wrap items-center gap-3"
                            : "mt-1 flex-row flex-wrap items-center gap-3 pl-10"
                    }
                >
                    <Text className="text-label-sm text-text-secondary">
                        {formatMessageTime(message.createdAt)}
                    </Text>

                    {isMine && deliveryState === "seen" && (
                        <View className="flex-row items-center gap-1">
                            <CheckCheck size={14} color="#0284c7" />
                            <Text className="text-label-sm font-semibold text-sky-500">
                                Seen
                            </Text>
                        </View>
                    )}

                    {isMine && deliveryState === "delivered" && (
                        <View className="flex-row items-center gap-1">
                            <CheckCheck size={14} color={colors.primary} />
                            <Text className="text-label-sm text-text-secondary">
                                Delivered
                            </Text>
                        </View>
                    )}

                    {isMine && deliveryState === "sent" && (
                        <View className="flex-row items-center gap-1">
                            <Check size={13} color={colors.textSecondary} />
                            <Text className="text-label-sm text-text-secondary">
                                Sent
                            </Text>
                        </View>
                    )}

                    {hasContent && Boolean(displayText) && (
                        <Pressable
                            onPress={handleCopy}
                            accessibilityRole="button"
                            accessibilityLabel="Copy message"
                            hitSlop={6}
                        >
                            <Text className="text-label-sm font-semibold text-primary">
                                {isCopied ? "Copied" : "Copy"}
                            </Text>
                        </Pressable>
                    )}

                    {isMine && !isPending && !isFailed && (
                        <Pressable
                            onPress={() => onDeleteMessage?.(message)}
                            accessibilityRole="button"
                            accessibilityLabel="Unsend message"
                            hitSlop={6}
                        >
                            <Text className="text-label-sm font-semibold text-primary">
                                Unsend
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}
        </Pressable>
        </View>

        {/* Reaction Modal Overlay on Long Press */}
        <Modal
            transparent
            visible={showReactionPicker}
            animationType="fade"
            onRequestClose={() => setShowReactionPicker(false)}
        >
            <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowReactionPicker(false)}
                className="bg-black/35"
            >
                <View
                    style={{
                        position: "absolute",
                        top: pickerY,
                        ...(isMine ? { right: 16 } : { left: 44 }),
                    }}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className="flex-row items-center gap-2 rounded-full bg-surface-lowest px-3.5 py-2 shadow-2xl border border-border"
                    >
                        {QUICK_EMOJIS.map((emoji) => {
                            const hasReacted = message.reactions?.some(
                                (r) => r.emoji === emoji && r.reactedByMe
                            );
                            return (
                                <Pressable
                                    key={emoji}
                                    onPress={() => {
                                        haptics.selection();
                                        onReaction?.(message.id, emoji);
                                        setShowReactionPicker(false);
                                    }}
                                    hitSlop={8}
                                    className={`rounded-full p-1.5 ${
                                        hasReacted
                                            ? "bg-primary/20 scale-110"
                                            : "active:scale-125"
                                    }`}
                                >
                                    <Text className="text-2xl leading-none">{emoji}</Text>
                                </Pressable>
                            );
                        })}

                        {isMine && !isPending && !isFailed && (
                            <>
                                <View className="h-5 w-px bg-border mx-0.5" />
                                <Pressable
                                    onPress={() => {
                                        setShowReactionPicker(false);
                                        onDeleteMessage?.(message);
                                    }}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Unsend message"
                                    className="rounded-full p-2 active:bg-surface-medium"
                                >
                                    <Trash2 size={18} color={colors.primary} />
                                </Pressable>
                            </>
                        )}
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
        </FadeSlideIn>
    );
});

const MessageRow = memo(function MessageRow({
    message,
    otherUserLastReadAt,
    showDateDivider,
    onRetry,
    isRetrying,
    onReaction,
    onDeleteMessage,
    onOpenMedia,
}: {
    message: Message;
    otherUserLastReadAt?: string | null;
    showDateDivider: boolean;
    onRetry: (message: Message) => void;
    isRetrying: boolean;
    onReaction?: (messageId: string, emoji: string) => void;
    onDeleteMessage?: (message: Message) => void;
    onOpenMedia?: (uri: string) => void;
}) {
    return (
        <View>
            {showDateDivider && <DateDivider value={message.createdAt} />}
            <MessageBubble
                message={message}
                otherUserLastReadAt={otherUserLastReadAt}
                onRetry={onRetry}
                isRetrying={isRetrying}
                onReaction={onReaction}
                onDeleteMessage={onDeleteMessage}
                onOpenMedia={onOpenMedia}
            />
        </View>
    );
});

function TypingBubble({
    name,
    avatarUrl,
}: {
    name?: string;
    avatarUrl?: string | null;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const firstName = name ? name.trim().split(/\s+/)[0] : "";
    const label = firstName ? `${firstName} is typing...` : "typing...";

    return (
        <FadeSlideIn
            className="mb-3 flex-row items-end gap-2"
            duration={MOTION.quick}
        >
            <View
                accessibilityLiveRegion="polite"
                accessibilityLabel={label}
                className="flex-row items-end gap-2"
            >
                <Avatar
                    src={avatarUrl}
                    name={name ?? ""}
                    className="h-7 w-7"
                    textClassName="text-[10px]"
                />
                <View className="flex-row items-center gap-1.5 rounded-2xl rounded-bl-sm bg-surface-lowest px-3.5 py-2">
                    {[0, 1, 2].map((index) => (
                        <TypingDot
                            key={index}
                            color={colors.primary}
                            index={index}
                            size={5}
                        />
                    ))}
                    <Text
                        className="ml-1 text-label-xs font-medium italic text-primary"
                        style={{ color: colors.primary }}
                    >
                        {label}
                    </Text>
                </View>
            </View>
        </FadeSlideIn>
    );
}

/**
 * Pending sends live in a module-level store keyed by conversation rather than component state: a send
 * can outlive the screen (the user backs out, or the thread remounts via the tab navigator) and dropping
 * the row on unmount would make the message silently disappear even though the request is still in
 * flight. Same subscribe/version shape as the decrypt cache so re-mounts pick up where they left off.
 */
const pendingStore = new Map<string, Message[]>();
const pendingListeners = new Set<() => void>();
let pendingVersion = 0;

function emitPendingChange() {
    pendingVersion += 1;
    for (const listener of pendingListeners) listener();
}

function getPendingMessages(
    conversationKey: string,
    // Accepted purely so callers re-read the store when the version changes; the store itself is
    // mutable, so the value is fetched fresh on every call.
    _version: number
): Message[] {
    return pendingStore.get(conversationKey) ?? [];
}

function setPendingMessages(
    conversationKey: string,
    updater: (previous: Message[]) => Message[]
) {
    const next = updater(pendingStore.get(conversationKey) ?? []);
    if (next.length === 0) pendingStore.delete(conversationKey);
    else pendingStore.set(conversationKey, next);
    emitPendingChange();
}

function subscribePending(listener: () => void) {
    pendingListeners.add(listener);
    return () => {
        pendingListeners.delete(listener);
    };
}

function getPendingVersion() {
    return pendingVersion;
}

export default function MessageThread({
    conversationId,
    messages,
    otherUserLastReadAt,
    recipientId,
    recipientUsername,
    recipientName,
    recipientAvatarUrl,
    isLoading,
    isLoadingOlder,
    onLoadOlder,
    bottomInset = 0,
}: {
    conversationId?: string;
    messages: Message[];
    otherUserLastReadAt?: string | null;
    recipientId?: string | null;
    recipientUsername: string;
    recipientName?: string;
    recipientAvatarUrl?: string | null;
    isLoading: boolean;
    isLoadingOlder?: boolean;
    onLoadOlder?: () => void;
    bottomInset?: number;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const { user } = useAuth();
    const userId = user?.id;
    const queryClient = useQueryClient();
    const sendMessage = useSendMessage();
    const { reportTyping, stopTyping } = useTypingBroadcast(recipientId);
    const isPartnerTyping = useTypingIndicator(recipientId);

    const [text, setText] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [lightboxUri, setLightboxUri] = useState<string | null>(null);
    const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = useCallback(async () => {
        if (!conversationId || !messageToDelete?.id) return;

        setIsDeleting(true);
        try {
            await deleteMessage(messageToDelete.id);
            removeMessageFromThreadCache(
                queryClient,
                conversationId,
                messageToDelete.id
            );
            haptics.medium();
            setMessageToDelete(null);
        } catch {
            haptics.error();
            Alert.alert("Error", "Could not unsend message. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    }, [conversationId, messageToDelete, queryClient]);

    const handleReaction = useCallback(
        async (messageId: string, emoji: string) => {
            if (!conversationId || !messageId || !emoji) return;

            haptics.selection();
            try {
                const response = await setMessageReaction(messageId, emoji);
                if (response?.data) {
                    updateMessageReactionsInThreadCache(
                        queryClient,
                        conversationId,
                        messageId,
                        response.data,
                        userId
                    );
                }
            } catch {
                Alert.alert("Error", "Could not update reaction.");
            }
        },
        [conversationId, queryClient, userId]
    );

    // Conversation-scoped so switching threads (or remounting) does not lose in-flight sends.
    const conversationKey = useMemo(() => {
        const raw = conversationId || recipientId || recipientUsername || "default";
        return raw.trim().toLowerCase();
    }, [conversationId, recipientId, recipientUsername]);

    const pendingVersion = useSyncExternalStore(
        subscribePending,
        getPendingVersion,
        getPendingVersion
    );

    const pendingMessages = useMemo(
        // pendingVersion is the external-store change signal: the store mutates in place, so the
        // version (not the snapshot identity) is what tells this memo to re-read.
        () => getPendingMessages(conversationKey, pendingVersion),
        [conversationKey, pendingVersion]
    );

    const combinedMessages = useMemo(() => {
        // Message IDs arrive from several sources with inconsistent casing (server rows, SignalR
        // pushes, optimistic entries), so compare them case-insensitively or the same message can
        // render twice.
        const storedIds = new Set(messages.map((m) => m.id.toLowerCase()));
        const storedTempIds = new Set(
            messages
                .map((m) => m.clientTempId?.toLowerCase())
                .filter(Boolean) as string[]
        );
        const activePending = pendingMessages.filter((pending) => {
            const pId = pending.id.toLowerCase();
            if (storedIds.has(pId)) return false;
            if (
                pending.clientTempId &&
                storedTempIds.has(pending.clientTempId.toLowerCase())
            ) {
                return false;
            }
            if (pending.realId && storedIds.has(pending.realId.toLowerCase())) {
                return false;
            }

            // Content-based deduplication for outgoing messages: if the confirmed message
            // is already present in messages, drop the pending optimistic entry immediately
            // so there is NEVER a frame where both appear or where the bubble flashes.
            const pendingText = (pending.plaintext ?? pending.content)?.trim();
            if (pending.isMine && pendingText && !pending.failed) {
                const alreadyInMessages = messages.some((m) => {
                    if (!m.isMine) return false;
                    const mText = (m.plaintext ?? peekDecrypted(m.content) ?? m.content)?.trim();
                    if (mText && mText === pendingText) {
                        const timeDiff = Math.abs(
                            new Date(m.createdAt).getTime() - new Date(pending.createdAt).getTime()
                        );
                        if (timeDiff < 60000) return true;
                    }
                    return false;
                });
                if (alreadyInMessages) return false;
            }

            return true;
        });
        return [...messages, ...activePending];
    }, [messages, pendingMessages]);

    const orderedMessages = useMemo(
        () => [...combinedMessages].reverse(),
        [combinedMessages]
    );

    const newDayMessageIds = useMemo(() => {
        const ids = new Set<string>();
        for (let i = 0; i < orderedMessages.length; i += 1) {
            if (
                isNewDay(
                    orderedMessages[i].createdAt,
                    orderedMessages[i + 1]?.createdAt
                )
            ) {
                ids.add(orderedMessages[i].id);
            }
        }
        return ids;
    }, [orderedMessages]);

    function handleChangeText(value: string) {
        setText(value);
        reportTyping(value.trim().length > 0);
    }

    function handleSelectEmoji(emoji: string) {
        if (text.length + emoji.length > MAX_PLAINTEXT_LENGTH) return;
        const next = text + emoji;
        setText(next);
        reportTyping(next.trim().length > 0);
    }

    // Unique per send so two messages sent in the same millisecond can never share a temp id
    // (which would make one overwrite the other in the pending list).
    const tempIdCounter = useRef(0);
    const inputRef = useRef<TextInput>(null);

    function nextTempId() {
        tempIdCounter.current += 1;
        return `pending-${Date.now()}-${tempIdCounter.current}`;
    }

    const updatePending = useCallback(
        (updater: (previous: Message[]) => Message[]) => {
            setPendingMessages(conversationKey, updater);
        },
        [conversationKey]
    );

    const transmitMessage = useCallback(
        async (contentText: string, existingTempId?: string) => {
            const tempId = existingTempId ?? nextTempId();
            const optimistic: Message = {
                id: tempId,
                clientTempId: tempId,
                content: contentText,
                plaintext: contentText,
                createdAt: new Date().toISOString(),
                isMine: true,
                pending: true,
                failed: false,
                deliveryStatus: "sending",
                sender: {
                    id: user?.id ?? "me",
                    name: user?.name ?? "",
                    username: user?.username ?? "",
                    avatarUrl: user?.avatarUrl ?? null,
                },
            };

            updatePending((prev) =>
                existingTempId
                    ? prev.map((m) => (m.id === existingTempId ? optimistic : m))
                    : [...prev, optimistic]
            );

            try {
                const response = await sendMessage.mutateAsync({
                    recipientUsername,
                    content: contentText,
                    clientTempId: tempId,
                });
                const serverId = response?.data?.message?.id;
                updatePending((prev) =>
                    prev.filter(
                        (m) =>
                            m.id !== tempId &&
                            m.clientTempId !== tempId &&
                            (serverId ? m.id !== serverId : true)
                    )
                );
            } catch (error) {
                haptics.error();
                updatePending((prev) =>
                    prev.map((m) =>
                        m.id === tempId || m.clientTempId === tempId
                            ? { ...m, pending: false, failed: true, deliveryStatus: "failed" }
                            : m
                    )
                );
                Alert.alert(
                    "Message not sent",
                    error instanceof ApiError
                        ? error.message
                        : "Something went wrong. Tap Retry on the message to try again."
                );
            }
        },
        [nextTempId, recipientUsername, sendMessage, updatePending, user]
    );

    function handleSend() {
        const trimmed = text.trim();
        if (!trimmed) return;

        inputRef.current?.clear();
        inputRef.current?.setNativeProps({ text: "" });
        setText("");
        stopTyping();
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        haptics.medium();
        void transmitMessage(trimmed);
    }

    const handleSelectGif = useCallback(
        (gif: GifItem) => {
            if (!gif?.url) return;
            const current = text.trim();
            const payload = current ? `${current}\n${gif.url}` : gif.url;
            inputRef.current?.clear();
            inputRef.current?.setNativeProps({ text: "" });
            setText("");
            stopTyping();
            setShowEmojiPicker(false);
            setShowGifPicker(false);
            haptics.medium();
            void transmitMessage(payload);
        },
        [text, stopTyping, transmitMessage]
    );

    const handleRetry = useCallback(
        async (failedMsg: Message) => {
            if (retryingIds.has(failedMsg.id)) return;
            const body = failedMsg.plaintext ?? failedMsg.content;
            if (!body) return;

            haptics.light();
            setRetryingIds((prev) => new Set(prev).add(failedMsg.id));
            try {
                await transmitMessage(body, failedMsg.id);
            } finally {
                setRetryingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(failedMsg.id);
                    return next;
                });
            }
        },
        [retryingIds, transmitMessage]
    );

    const keyExtractor = useCallback(
        (message: Message) => message.clientTempId ?? message.id,
        []
    );

    const renderItem = useCallback(
        ({ item }: { item: Message }) => (
            <MessageRow
                message={item}
                otherUserLastReadAt={otherUserLastReadAt}
                showDateDivider={newDayMessageIds.has(item.id)}
                onRetry={handleRetry}
                isRetrying={retryingIds.has(item.id)}
                onReaction={handleReaction}
                onDeleteMessage={setMessageToDelete}
                onOpenMedia={setLightboxUri}
            />
        ),
        [
            otherUserLastReadAt,
            newDayMessageIds,
            handleRetry,
            retryingIds,
            handleReaction,
            setMessageToDelete,
        ]
    );

    const showCounter = text.length >= COUNTER_SHOW_THRESHOLD;
    const isNearLimit = text.length >= COUNTER_WARN_THRESHOLD;

    return (
        <View className="flex-1">
            {isLoading && orderedMessages.length === 0 ? (
                <View className="flex-1 justify-end bg-surface-low">
                    <MessageThreadSkeleton />
                </View>
            ) : (
                <FlatList
                    inverted
                    data={orderedMessages}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    initialNumToRender={14}
                    maxToRenderPerBatch={10}
                    windowSize={9}
                    removeClippedSubviews={false}
                    contentContainerClassName="grow px-4 py-4"
                    keyboardShouldPersistTaps="handled"
                    onEndReached={onLoadOlder}
                    onEndReachedThreshold={0.2}
                    ListHeaderComponent={
                        isPartnerTyping ? (
                            <TypingBubble
                                name={recipientName || recipientUsername}
                                avatarUrl={recipientAvatarUrl}
                            />
                        ) : null
                    }
                    ListFooterComponent={
                        isLoadingOlder ? (
                            <View className="items-center py-3">
                                <ActivityIndicator color={colors.primary} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-10">
                            <Text className="text-center text-body-sm text-text-secondary">
                                No messages yet. Say hello to{" "}
                                {recipientUsername
                                    ? `@${recipientUsername}`
                                    : "them"}
                                !
                            </Text>
                        </View>
                    }
                />
            )}

            <View
                className="bg-surface-lowest"
                style={
                    bottomInset > 0
                        ? { paddingBottom: bottomInset }
                        : undefined
                }
            >
                <View className="px-4 py-3">
                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={() => {
                                setShowEmojiPicker((open) => {
                                    const nextOpen = !open;
                                    if (nextOpen) {
                                        Keyboard.dismiss();
                                    }
                                    return nextOpen;
                                });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Toggle emoji picker"
                            accessibilityState={{ expanded: showEmojiPicker }}
                            hitSlop={6}
                            className={
                                showEmojiPicker
                                    ? "h-10 w-10 items-center justify-center rounded-full bg-active"
                                    : "h-10 w-10 items-center justify-center rounded-full"
                            }
                        >
                            <Smile
                                size={24}
                                color={
                                    showEmojiPicker
                                        ? colors.primary
                                        : colors.textSecondary
                                }
                            />
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                haptics.selection();
                                Keyboard.dismiss();
                                setShowEmojiPicker(false);
                                setShowGifPicker(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Add GIF"
                            hitSlop={6}
                            className="h-10 w-9 items-center justify-center rounded-full"
                        >
                            <View className="rounded border border-border px-1 py-0.5">
                                <Text className="text-[10px] font-bold text-text-secondary">
                                    GIF
                                </Text>
                            </View>
                        </Pressable>

                        <TextInput
                            ref={inputRef}
                            value={text}
                            onChangeText={handleChangeText}
                            onFocus={() => setShowEmojiPicker(false)}
                            maxLength={MAX_PLAINTEXT_LENGTH}
                            placeholder="Write a message..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            className="max-h-32 flex-1 rounded-2xl border border-border bg-surface-low px-4 py-2.5 text-body-sm text-text-primary"
                        />

                        <Pressable
                            onPress={handleSend}
                            disabled={text.trim().length === 0}
                            accessibilityRole="button"
                            accessibilityLabel="Send message"
                            hitSlop={6}
                            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
                        >
                            <Send
                                size={18}
                                color={colors.buttonGradientText}
                            />
                        </Pressable>
                    </View>

                    {showCounter && (
                        <Text
                            className={
                                isNearLimit
                                    ? "mt-1 text-right text-label-sm font-medium text-error"
                                    : "mt-1 text-right text-label-sm text-text-secondary"
                            }
                        >
                            {text.length} / {MAX_PLAINTEXT_LENGTH}
                        </Text>
                    )}
                </View>

                {showEmojiPicker && (
                    <EmojiPicker onSelect={handleSelectEmoji} />
                )}
            </View>

            {showGifPicker && (
                <GifPicker
                    visible={showGifPicker}
                    onClose={() => setShowGifPicker(false)}
                    onSelect={handleSelectGif}
                />
            )}

            {Boolean(lightboxUri) && (
                <MediaLightbox
                    visible={Boolean(lightboxUri)}
                    imageUri={lightboxUri}
                    altText="GIF Preview"
                    onClose={() => setLightboxUri(null)}
                />
            )}

            <ConfirmModal
                visible={Boolean(messageToDelete)}
                title="Unsend Message"
                message="Are you sure you want to unsend this message? It will be removed for everyone in this chat."
                cancelText="Cancel"
                confirmText="Unsend"
                destructive={false}
                loading={isDeleting}
                onCancel={() => setMessageToDelete(null)}
                onConfirm={handleConfirmDelete}
            />
        </View>
    );
}
