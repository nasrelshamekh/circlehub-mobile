import * as Clipboard from "expo-clipboard";
import { AlertCircle, Check, CheckCheck, RotateCcw, Send, Smile } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import Avatar from "@/components/avatar";
import EmojiPicker from "@/components/messages/emojipicker";
import SharedPostCard from "@/components/messages/sharedpostcard";
import MessageThreadSkeleton from "@/components/skeletons/messagethreadskeleton";
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
import { themeColors } from "@/theme/colors";
import { ApiError } from "@/types/api";
import { Message } from "@/types/message";

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
    onRetry,
    isRetrying,
}: {
    message: Message;
    onRetry?: (message: Message) => void;
    isRetrying?: boolean;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const isMine = message.isMine;
    const isPending = Boolean(message.pending);
    const isFailed = Boolean(message.failed);
    const hasContent = Boolean(message.content && message.content.length > 0);

    let deliveryState: "sent" | "delivered" | "failed" | null = null;
    if (isMine) {
        if (isFailed) {
            deliveryState = "failed";
        } else if (isPending) {
            deliveryState = null;
        } else if (message.deliveryStatus === "sent") {
            deliveryState = "sent";
        } else {
            deliveryState = "delivered";
        }
    }
    const cachedPlaintext = message.plaintext ?? peekDecrypted(message.content);
    const { text: decryptedText, isPending: isDecrypting } =
        useDecryptedContent(cachedPlaintext ? null : message.content);

    const displayText = cachedPlaintext ?? decryptedText;
    const isActuallyDecrypting = !cachedPlaintext && isDecrypting && !isMine;

    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!isCopied) return;

        const timeout = setTimeout(() => setIsCopied(false), 1500);

        return () => clearTimeout(timeout);
    }, [isCopied]);

    async function handleCopy() {
        if (!displayText) return;

        await Clipboard.setStringAsync(displayText);
        setIsCopied(true);
    }

    return (
        <FadeSlideIn
            duration={isPending ? MOTION.quick : 0}
            from={isPending ? 4 : 0}
        >
            <Pressable
                onPress={() => setIsExpanded((expanded) => !expanded)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                accessibilityHint="Shows when the message was sent"
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
                        <View
                            className={
                                isMine
                                    ? isFailed
                                        ? "rounded-2xl rounded-br-md border border-error bg-primary px-4 py-2.5"
                                        : "rounded-2xl rounded-br-md bg-primary px-4 py-2.5"
                                    : "rounded-2xl rounded-bl-md bg-surface-lowest px-4 py-2.5"
                            }
                        >
                            {isActuallyDecrypting && !displayText ? (
                                <View
                                    accessibilityLabel="Loading message"
                                    className="gap-1.5"
                                >
                                    <View className="h-3 w-28 rounded-full bg-surface-high" />
                                    <View className="h-3 w-16 rounded-full bg-surface-high" />
                                </View>
                            ) : (
                                <Text
                                    className={
                                        isMine
                                            ? "text-body-sm text-on-primary"
                                            : "text-body-sm text-text-primary"
                                    }
                                >
                                    {displayText}
                                </Text>
                            )}
                        </View>
                    )}

                    {message.postId && <SharedPostCard post={message.post} />}
                </View>

            </View>

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
                        deliveryState === "delivered" ? "Delivered" : "Sent"
                    }
                    className="mt-0.5 flex-row items-center justify-end pr-0.5"
                >
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
                            ? "mt-1 flex-row items-center gap-3"
                            : "mt-1 flex-row items-center gap-3 pl-10"
                    }
                >
                    <Text className="text-label-sm text-text-secondary">
                        {formatMessageTime(message.createdAt)}
                    </Text>

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
                </View>
            )}
        </Pressable>
        </FadeSlideIn>
    );
});

const MessageRow = memo(function MessageRow({
    message,
    showDateDivider,
    onRetry,
    isRetrying,
}: {
    message: Message;
    showDateDivider: boolean;
    onRetry: (message: Message) => void;
    isRetrying: boolean;
}) {
    return (
        <View>
            {showDateDivider && <DateDivider value={message.createdAt} />}
            <MessageBubble
                message={message}
                onRetry={onRetry}
                isRetrying={isRetrying}
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
    const sendMessage = useSendMessage();
    const { reportTyping, stopTyping } = useTypingBroadcast(recipientId);
    const isPartnerTyping = useTypingIndicator(recipientId);

    const [text, setText] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

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
                deliveryStatus: "sent",
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
        haptics.medium();
        void transmitMessage(trimmed);
    }

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
                showDateDivider={newDayMessageIds.has(item.id)}
                onRetry={handleRetry}
                isRetrying={retryingIds.has(item.id)}
            />
        ),
        [newDayMessageIds, handleRetry, retryingIds]
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
        </View>
    );
}
