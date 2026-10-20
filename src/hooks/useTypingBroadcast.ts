import { useCallback, useEffect, useRef } from "react";

import { useChatConnection } from "@/context/chatconnectioncontext";

const REFRESH_MS = 2_000;
const IDLE_STOP_MS = 3_000;

export function useTypingBroadcast(recipientId?: string | null) {
    const { notifyTyping } = useChatConnection();
    const lastSentAtRef = useRef(0);
    const activeRef = useRef(false);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const stopTyping = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        lastSentAtRef.current = 0;

        if (!activeRef.current) return;
        activeRef.current = false;

        if (recipientId) {
            notifyTyping(recipientId, false);
        }
    }, [notifyTyping, recipientId]);

    const reportTyping = useCallback(
        (hasText: boolean) => {
            if (!recipientId) return;

            if (!hasText) {
                stopTyping();
                return;
            }

            const now = Date.now();
            if (now - lastSentAtRef.current >= REFRESH_MS) {
                // Only advance the throttle when the signal actually reached a live connection.
                // Otherwise a report while offline would suppress the next 2s of typing pulses
                // without anything having been sent.
                if (notifyTyping(recipientId, true)) {
                    lastSentAtRef.current = now;
                    activeRef.current = true;
                }
            }

            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
            idleTimerRef.current = setTimeout(stopTyping, IDLE_STOP_MS);
        },
        [notifyTyping, recipientId, stopTyping]
    );

    useEffect(() => () => stopTyping(), [stopTyping]);

    return { reportTyping, stopTyping };
}
