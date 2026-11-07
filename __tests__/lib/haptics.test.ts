import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { act, renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";

import {
    HAPTICS_STORAGE_KEY,
    haptics,
    isHapticsEnabled,
    setHapticsEnabled,
    useHapticsSetting,
} from "@/lib/haptics";

jest.mock("expo-haptics", () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    selectionAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: "light",
        Medium: "medium",
        Heavy: "heavy",
    },
    NotificationFeedbackType: {
        Success: "success",
        Warning: "warning",
        Error: "error",
    },
}));

describe("haptics helper", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        Platform.OS = "ios";
        await setHapticsEnabled(true);
    });

    it("triggers light impact feedback", () => {
        (Haptics.impactAsync as jest.Mock).mockResolvedValue(undefined);
        haptics.light();
        expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
    });

    it("triggers medium impact feedback", () => {
        (Haptics.impactAsync as jest.Mock).mockResolvedValue(undefined);
        haptics.medium();
        expect(Haptics.impactAsync).toHaveBeenCalledWith("medium");
    });

    it("triggers selection feedback", () => {
        (Haptics.selectionAsync as jest.Mock).mockResolvedValue(undefined);
        haptics.selection();
        expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it("triggers success notification feedback", () => {
        (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
        haptics.success();
        expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
    });

    it("triggers error notification feedback", () => {
        (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
        haptics.error();
        expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
    });

    it("does not throw if underlying haptics call rejects or returns undefined", () => {
        (Haptics.impactAsync as jest.Mock).mockReturnValue(undefined);
        expect(() => haptics.light()).not.toThrow();

        (Haptics.impactAsync as jest.Mock).mockRejectedValue(new Error("unsupported"));
        expect(() => haptics.medium()).not.toThrow();
    });

    it("no-ops on web platform", () => {
        Platform.OS = "web";
        haptics.light();
        haptics.medium();
        haptics.selection();
        haptics.success();
        haptics.error();

        expect(Haptics.impactAsync).not.toHaveBeenCalled();
        expect(Haptics.selectionAsync).not.toHaveBeenCalled();
        expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it("respects user preference when disabled", async () => {
        await act(async () => {
            await setHapticsEnabled(false);
        });

        expect(isHapticsEnabled()).toBe(false);
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(HAPTICS_STORAGE_KEY, "false");

        haptics.light();
        haptics.medium();
        haptics.selection();
        haptics.success();
        haptics.error();

        expect(Haptics.impactAsync).not.toHaveBeenCalled();
        expect(Haptics.selectionAsync).not.toHaveBeenCalled();
        expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it("re-enables haptics when preference is turned back on", async () => {
        await act(async () => {
            await setHapticsEnabled(false);
            await setHapticsEnabled(true);
        });

        expect(isHapticsEnabled()).toBe(true);
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(HAPTICS_STORAGE_KEY, "true");

        (Haptics.impactAsync as jest.Mock).mockResolvedValue(undefined);
        haptics.light();
        expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
    });

    it("updates hook listeners via useHapticsSetting", async () => {
        const { result } = await renderHook(() => useHapticsSetting());

        expect(result.current[0]).toBe(true);

        await act(async () => {
            await result.current[1](false);
        });

        expect(result.current[0]).toBe(false);
        expect(isHapticsEnabled()).toBe(false);
    });
});
