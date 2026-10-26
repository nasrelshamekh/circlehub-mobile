import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { haptics } from "@/lib/haptics";

jest.mock("expo-haptics", () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
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
    beforeEach(() => {
        jest.clearAllMocks();
        Platform.OS = "ios";
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
        haptics.success();
        haptics.error();

        expect(Haptics.impactAsync).not.toHaveBeenCalled();
        expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
});
