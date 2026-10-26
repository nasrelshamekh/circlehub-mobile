import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export const haptics = {
    light: () => {
        if (Platform.OS === "web") return;
        try {
            const res = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
    medium: () => {
        if (Platform.OS === "web") return;
        try {
            const res = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
    success: () => {
        if (Platform.OS === "web") return;
        try {
            const res = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
    error: () => {
        if (Platform.OS === "web") return;
        try {
            const res = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (res && typeof res.catch === "function") {
                res.catch(() => {});
            }
        } catch {}
    },
};
