import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Animated as NativeAnimated, Easing as NativeEasing } from "react-native";
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * Shared motion primitives. Kept in one file so the whole app moves with the same
 * vocabulary — durations and easings live here rather than at each call site, so a
 * change lands everywhere at once instead of drifting component by component.
 */

export const MOTION = {
    /** Fast enough to feel like a direct response to the user's own action. */
    quick: 160,
    /** The default: visible, but never something the user waits on. */
    standard: 240,
    /** For anything that travels a distance, or arrives without being asked for. */
    gentle: 320,
    /** One full turn of a loop. Slow enough to read as "busy", not as a glitch. */
    loop: 900,
} as const;

/**
 * A view that fades and slides in when it mounts. Used for message bubbles, where the
 * motion is the only cue that a row is new rather than part of the history the reader
 * just scrolled past.
 *
 * Built on React Native's own `Animated` rather than Reanimated — the same reasoning as
 * `SkeletonShimmer`: this wraps every cell of a scrolling list, and Reanimated's
 * mount-time value propagation on Fabric intermittently left cells pinned at their
 * initial `opacity: 0`. The row kept its layout but painted nothing, which surfaced as
 * a large blank space you could scroll through in the thread. RN's `Animated` drives
 * opacity and transform through the native driver without Reanimated's prop-flush path.
 *
 * A configuration of `duration: 0` + `from: 0` (every history bubble) never animates at
 * all: progress is pinned at 1 from the first frame, so a settled row cannot depend on
 * an effect firing to become visible.
 *
 * `from` is the starting offset in logical pixels: negative rises from below (an
 * arriving message), positive drops from above.
 */
export function FadeSlideIn({
    children,
    className,
    style,
    from = 8,
    delay = 0,
    duration = MOTION.standard,
}: {
    children: ReactNode;
    className?: string;
    style?: StyleProp<ViewStyle>;
    from?: number;
    delay?: number;
    duration?: number;
}) {
    // Unconditional hooks: callers switch configuration across renders (a pending send
    // settles into history, 160/6 → 0/0), and a conditional hook count would crash on
    // exactly that transition.
    const isNoop = duration === 0 && from === 0;
    const [progress] = useState(() => new NativeAnimated.Value(isNoop ? 1 : 0));

    useEffect(() => {
        if (isNoop) {
            progress.setValue(1);
            return undefined;
        }

        const animation = NativeAnimated.timing(progress, {
            toValue: 1,
            duration,
            delay,
            easing: NativeEasing.out(NativeEasing.cubic),
            useNativeDriver: true,
        });

        animation.start();

        // A cell can unmount mid-flight (the list scrolls, the screen changes); stop the
        // native animation so it does not keep writing to a detached view.
        return () => animation.stop();
    }, [delay, duration, isNoop, progress]);

    const animatedStyle = {
        opacity: progress,
        transform: [
            {
                translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [from, 0],
                }),
            },
        ],
    };

    return (
        <NativeAnimated.View
            className={className}
            style={[style, animatedStyle]}
        >
            {children}
        </NativeAnimated.View>
    );
}

/**
 * A slow opacity pulse for a status dot that stays on screen. Deliberately shallow
 * (0.55 → 1) and slow: the dot is conveying "online right now", and a fast or deep
 * pulse would read as an alert instead of a state.
 */
export function PulsingDot({
    color,
    size = 12,
    className,
    style,
}: {
    color: string;
    size?: number;
    className?: string;
    style?: StyleProp<ViewStyle>;
}) {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, {
                duration: MOTION.loop + 400,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            true
        );

        return () => cancelAnimation(pulse);
    }, [pulse]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: 0.55 + pulse.value * 0.45,
    }));

    return (
        <Animated.View
            className={className}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                },
                style,
                animatedStyle,
            ]}
        />
    );
}

/**
 * One dot of a typing indicator. The dots share a period and differ only in phase, so
 * the group reads as a single travelling wave rather than three dots pulsing at once —
 * which is what makes it legible as "someone is writing" instead of "something is busy".
 */
export function TypingDot({
    color,
    index,
    size = 8,
}: {
    color: string;
    index: number;
    size?: number;
}) {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withDelay(
            index * 160,
            withRepeat(
                withTiming(1, {
                    duration: 600,
                    easing: Easing.inOut(Easing.quad),
                }),
                -1,
                true
            )
        );

        return () => cancelAnimation(pulse);
    }, [index, pulse]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: 0.3 + pulse.value * 0.7,
    }));

    return (
        <Animated.View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                },
                animatedStyle,
            ]}
        />
    );
}

/**
 * A travelling highlight laid over a skeleton block. The bar is a light diagonal wash
 * that crosses left-to-right on a loop, which is what separates "still loading" from
 * "this screen is broken" — the latter is how a static grey block reads.
 *
 * Deliberately built on React Native's own `Animated` rather than Reanimated. This
 * component is used *inside* scrolling lists (through `Skeleton`, which the twelve
 * skeleton components all build on), and Reanimated's synchronous prop flush runs on
 * every Fabric scroll event: on a recycled cell whose native tag is already gone it
 * throws `synchronouslyUpdateUIProps failed for tag N` per event, which measured as
 * tens of thousands of log lines per swipe. `Animated` drives the transform natively
 * through `useNativeDriver`, so the scroll path never touches it.
 *
 * `pointerEvents="none"` so the overlay never swallows a press meant for the list
 * underneath, and the parent is expected to be `overflow-hidden` + `relative`.
 */
export function SkeletonShimmer({
    width,
    color,
    className,
}: {
    width: number;
    color: string;
    className?: string;
}) {
    const [translateX] = useState(() => new NativeAnimated.Value(0));

    useEffect(() => {
        const loop = NativeAnimated.loop(
            NativeAnimated.timing(translateX, {
                toValue: 1,
                duration: 1200,
                easing: NativeEasing.linear,
                useNativeDriver: true,
            })
        );

        loop.start();

        return () => loop.stop();
    }, [translateX]);

    const animatedStyle = {
        transform: [
            {
                translateX: translateX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-width, width],
                }),
            },
        ],
    };

    return (
        <NativeAnimated.View
            pointerEvents="none"
            className={className}
            style={[{ width, backgroundColor: color }, animatedStyle]}
        />
    );
}
