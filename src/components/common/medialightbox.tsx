import React, { useEffect, useRef, useState } from "react";
import {
    BackHandler,
    Dimensions,
    Modal,
    PanResponder,
    Pressable,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Share2, X } from "lucide-react-native";

interface MediaLightboxProps {
    visible: boolean;
    imageUri: string | null;
    altText?: string;
    onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function MediaLightbox({
    visible,
    imageUri,
    altText,
    onClose,
}: MediaLightboxProps) {
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const lastTapRef = useRef<number>(0);

    // Hardware back button handler on Android
    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            onClose();
            return true;
        });
        return () => sub.remove();
    }, [visible, onClose]);

    // Reset zoom when opened
    useEffect(() => {
        if (visible) {
            setZoomScale(1);
        }
    }, [visible]);

    // Handle double-tap to toggle zoom
    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
            setZoomScale((prev) => (prev > 1 ? 1 : 2.5));
            scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        }
        lastTapRef.current = now;
    };

    // PanResponder for swipe-down to dismiss when not zoomed
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only enable swipe down when not zoomed and gesture is predominantly vertical downwards
                return zoomScale <= 1 && gestureState.dy > 15 && Math.abs(gestureState.dx) < gestureState.dy;
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 80 || gestureState.vy > 0.6) {
                    onClose();
                }
            },
        })
    ).current;

    const handleShare = async () => {
        if (!imageUri) return;
        try {
            await Share.share({
                url: imageUri,
                message: altText || imageUri,
            });
        } catch {}
    };

    if (!visible || !imageUri) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#000000" />
            <View style={styles.container} {...panResponder.panHandlers}>
                {/* Top Toolbar */}
                <View
                    style={[
                        styles.toolbar,
                        { paddingTop: Math.max(insets.top, 16) + 8 },
                    ]}
                >
                    <Pressable
                        onPress={handleShare}
                        style={styles.toolButton}
                        accessibilityRole="button"
                        accessibilityLabel="Share image"
                        hitSlop={8}
                    >
                        <Share2 size={20} color="#FFFFFF" />
                    </Pressable>

                    <Pressable
                        onPress={onClose}
                        style={styles.toolButton}
                        accessibilityRole="button"
                        accessibilityLabel="Close image viewer"
                        hitSlop={8}
                    >
                        <X size={22} color="#FFFFFF" />
                    </Pressable>
                </View>

                {/* Pinchable & Zoomable Image Area */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    centerContent
                    onScrollEndDrag={(e) => {
                        const currentZoom = e.nativeEvent.zoomScale ?? 1;
                        setZoomScale(currentZoom);
                    }}
                >
                    <Pressable onPress={handleDoubleTap}>
                        <ExpoImage
                            source={{ uri: imageUri }}
                            style={[
                                styles.image,
                                zoomScale > 1 && {
                                    transform: [{ scale: zoomScale }],
                                },
                            ]}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={150}
                        />
                    </Pressable>
                </ScrollView>

                {/* Bottom hint pill */}
                <View
                    style={[
                        styles.bottomBar,
                        { paddingBottom: Math.max(insets.bottom, 12) + 8 },
                    ]}
                >
                    <Text style={styles.hintText}>
                        Pinch or double-tap to zoom • Swipe down to close
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    toolbar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: 16,
        gap: 12,
    },
    toolButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    scrollArea: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    scrollContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 40,
    },
    hintText: {
        color: "rgba(255, 255, 255, 0.45)",
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
});
