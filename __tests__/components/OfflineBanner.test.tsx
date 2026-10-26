import { act, cleanup, render } from "@testing-library/react-native";
import React from "react";

import OfflineBanner from "@/components/ui/offlinebanner";
import { ThemeProvider } from "@/context/themecontext";

let mockStatus: "idle" | "connecting" | "live" | "reconnecting" | "offline" = "live";
let netInfoCallback: ((state: any) => void) | null = null;

jest.mock("@/context/chatconnectioncontext", () => ({
    useChatConnection: () => ({
        status: mockStatus,
        typingUsers: {},
        notifyTyping: jest.fn(),
        setActiveConversationId: jest.fn(),
    }),
}));

jest.mock("@react-native-community/netinfo", () => ({
    __esModule: true,
    default: {
        addEventListener: jest.fn((callback) => {
            netInfoCallback = callback;
            return jest.fn();
        }),
    },
}));

jest.mock("react-native-safe-area-context", () => ({
    useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

async function renderWithTheme(ui: React.ReactElement) {
    return await render(<ThemeProvider>{ui}</ThemeProvider>);
}

afterEach(() => {
    cleanup();
    mockStatus = "live";
    netInfoCallback = null;
    jest.clearAllTimers();
});

describe("OfflineBanner (Offline / Reconnecting Pill Banner)", () => {
    it("does not render when online and connection is live", async () => {
        mockStatus = "live";
        const result = await renderWithTheme(<OfflineBanner />);
        expect(result.queryByTestId("offline-reconnecting-banner")).toBeNull();
    });

    it("renders 'You\\'re offline. Reconnecting...' when SignalR is reconnecting", async () => {
        mockStatus = "reconnecting";
        const result = await renderWithTheme(<OfflineBanner />);

        expect(result.getByTestId("offline-reconnecting-banner")).toBeTruthy();
        expect(result.getByText("You're offline. Reconnecting...")).toBeTruthy();
    });

    it("renders 'You\\'re offline. Reconnecting...' when SignalR is offline", async () => {
        mockStatus = "offline";
        const result = await renderWithTheme(<OfflineBanner />);

        expect(result.getByTestId("offline-reconnecting-banner")).toBeTruthy();
        expect(result.getByText("You're offline. Reconnecting...")).toBeTruthy();
    });

    it("renders 'You\\'re offline. Reconnecting...' when network drops", async () => {
        mockStatus = "live";
        const result = await renderWithTheme(<OfflineBanner />);

        expect(result.queryByTestId("offline-reconnecting-banner")).toBeNull();

        await act(async () => {
            netInfoCallback?.({ isConnected: false, isInternetReachable: false });
        });

        expect(result.getByTestId("offline-reconnecting-banner")).toBeTruthy();
        expect(result.getByText("You're offline. Reconnecting...")).toBeTruthy();
    });

    it("transitions to 'Back online' when connection is restored", async () => {
        jest.useFakeTimers();
        mockStatus = "reconnecting";
        const result = await renderWithTheme(<OfflineBanner />);

        expect(result.getByText("You're offline. Reconnecting...")).toBeTruthy();

        // Restore connection
        mockStatus = "live";
        await act(async () => {
            await result.rerender(
                <ThemeProvider>
                    <OfflineBanner />
                </ThemeProvider>
            );
        });

        expect(result.getByText("Back online")).toBeTruthy();

        // Advance timer by 2100ms to auto-dismiss
        await act(async () => {
            jest.advanceTimersByTime(2100);
        });

        expect(result.queryByTestId("offline-reconnecting-banner")).toBeNull();
        jest.useRealTimers();
    });
});
