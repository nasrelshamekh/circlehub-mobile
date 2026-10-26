import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import React from "react";

import MessageThread from "@/components/messages/messagethread";
import { ThemeProvider } from "@/context/themecontext";
import { Message } from "@/types/message";

jest.mock("@/components/ui/motion", () => {
    const { View } = require("react-native");
    return {
        FadeSlideIn: ({ children, ...props }: any) => <View {...props}>{children}</View>,
        TypingDot: () => null,
        MOTION: { quick: 150, normal: 250 },
    };
});

const mockUser = {
    id: "user-1",
    username: "alice",
    name: "Alice",
    avatarUrl: null,
};

jest.mock("@/context/authcontext", () => ({
    useAuth: () => ({
        user: mockUser,
        status: "authenticated",
    }),
}));

jest.mock("@/hooks/mutations/useSendMessage", () => ({
    __esModule: true,
    default: () => ({
        mutateAsync: jest.fn(),
        isPending: false,
    }),
}));

jest.mock("@/hooks/useTypingBroadcast", () => ({
    useTypingBroadcast: () => ({
        reportTyping: jest.fn(),
        stopTyping: jest.fn(),
    }),
}));

jest.mock("@/hooks/useTypingIndicator", () => ({
    useTypingIndicator: () => false,
}));

jest.mock("@/hooks/useDecryptedContent", () => ({
    useDecryptedContent: (content: string) => ({
        text: content,
        isPending: false,
    }),
}));

async function renderWithProviders(ui: React.ReactElement) {
    let result: any;
    await act(async () => {
        result = render(<ThemeProvider>{ui}</ThemeProvider>);
    });
    return result;
}

afterEach(() => {
    cleanup();
});

describe("MessageThread delivery states", () => {
    it("does not render clock or Sending… text for in-flight pending messages (matching webapp behavior)", async () => {
        const pendingMessage: Message = {
            id: "temp-1",
            content: "Hello in flight",
            plaintext: "Hello in flight",
            createdAt: new Date().toISOString(),
            isMine: true,
            pending: true,
            failed: false,
            deliveryStatus: "sending",
            sender: mockUser,
        };

        const { queryByText, queryByTestId } = await renderWithProviders(
            <MessageThread
                messages={[pendingMessage]}
                recipientUsername="bob"
                isLoading={false}
            />
        );

        expect(queryByText("Sending…")).toBeNull();
        expect(queryByTestId("message-status-sending")).toBeNull();
        expect(queryByTestId("message-status-sent")).toBeNull();
        expect(queryByTestId("message-status-delivered")).toBeNull();
    });

    it("renders single checkmark for acknowledged sent messages", async () => {
        const sentMessage: Message = {
            id: "temp-sent",
            content: "Sent to server",
            plaintext: "Sent to server",
            createdAt: new Date().toISOString(),
            isMine: true,
            pending: false,
            failed: false,
            deliveryStatus: "sent",
            sender: mockUser,
        };

        const { getByTestId, getByText } = await renderWithProviders(
            <MessageThread
                messages={[sentMessage]}
                recipientUsername="bob"
                isLoading={false}
            />
        );

        expect(getByTestId("message-status-sent")).toBeTruthy();

        // Expanding shows Sent label
        await act(async () => {
            fireEvent.press(getByText("Sent to server"));
        });

        expect(getByText("Sent")).toBeTruthy();
    });

    it("renders Failed to send with Retry for failed messages", async () => {
        const failedMessage: Message = {
            id: "temp-failed",
            content: "Failed text",
            plaintext: "Failed text",
            createdAt: new Date().toISOString(),
            isMine: true,
            pending: false,
            failed: true,
            deliveryStatus: "failed",
            sender: mockUser,
        };

        const { getByText } = await renderWithProviders(
            <MessageThread
                messages={[failedMessage]}
                recipientUsername="bob"
                isLoading={false}
            />
        );

        expect(getByText("Failed to send")).toBeTruthy();
        expect(getByText("Retry")).toBeTruthy();
    });

    it("renders double checkmark (delivered state) when delivered and shows Delivered label when expanded", async () => {
        const deliveredMessage: Message = {
            id: "msg-delivered",
            content: "Delivered content",
            plaintext: "Delivered content",
            createdAt: "2026-10-26T12:00:00.000Z",
            isMine: true,
            pending: false,
            failed: false,
            sender: mockUser,
        };

        const { getByText, getByTestId, queryByText } = await renderWithProviders(
            <MessageThread
                messages={[deliveredMessage]}
                recipientUsername="bob"
                isLoading={false}
            />
        );

        // Shows double checkmark indicator in collapsed bubble
        expect(getByTestId("message-status-delivered")).toBeTruthy();

        // Before tapping to expand, Delivered text is not in collapsed view
        expect(queryByText("Delivered")).toBeNull();

        // Tap the message bubble to expand
        await act(async () => {
            fireEvent.press(getByText("Delivered content"));
        });

        // After tapping, shows Delivered and Copy
        expect(getByText("Delivered")).toBeTruthy();
        expect(getByText("Copy")).toBeTruthy();
    });
});
