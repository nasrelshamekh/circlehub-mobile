import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { NotificationTypeBadgeIcon } from "@/components/common/notificationbadge";
import InAppMessageNotification from "@/components/messages/inappmessagenotification";
import { ThemeProvider } from "@/context/themecontext";

async function renderWithTheme(ui: React.ReactElement) {
    let result: any;
    await act(async () => {
        result = render(<ThemeProvider>{ui}</ThemeProvider>);
    });
    return result;
}

afterEach(() => {
    cleanup();
});

describe("InAppMessageNotification (In-app notification layout)", () => {
    it("renders single message in collapsed preview state by default", async () => {
        const onPress = jest.fn();
        const { getByText, getByTestId } = await renderWithTheme(
            <InAppMessageNotification
                senderName="Sarah Connor"
                messages={["Come with me if you want to live."]}
                onPress={onPress}
            />
        );

        // Sender name prominently visible
        expect(getByText("Sarah Connor")).toBeTruthy();

        // Collapsed preview shows single message
        expect(getByTestId("in-app-message-notification-collapsed-preview")).toBeTruthy();
        expect(getByText("Come with me if you want to live.")).toBeTruthy();

        // Tapping the card triggers onPress
        fireEvent.press(getByTestId("in-app-message-notification-collapsed-preview"));
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("groups multiple messages from the same sender in expanded state without repeating sender identity", async () => {
        const messages = [
            "Hey, are you free tonight?",
            "We are planning the group dinner.",
            "Let me know before 7 PM!",
        ];

        const { getByText, queryAllByText, getByTestId } = await renderWithTheme(
            <InAppMessageNotification
                senderName="John Doe"
                senderAvatarUrl="https://example.com/avatar.jpg"
                messages={messages}
                defaultExpanded={true}
            />
        );

        // Sender name is shown once at the top
        expect(queryAllByText("John Doe")).toHaveLength(1);

        // Badge shows message count
        expect(getByText("3 messages")).toBeTruthy();

        // All 3 messages rendered vertically in expanded container
        expect(getByTestId("in-app-message-notification-expanded-messages")).toBeTruthy();
        expect(getByText("Hey, are you free tonight?")).toBeTruthy();
        expect(getByText("We are planning the group dinner.")).toBeTruthy();
        expect(getByText("Let me know before 7 PM!")).toBeTruthy();
    });

    it("shows latest message in collapsed state and reveals all messages upon expand toggle", async () => {
        const messages = ["First message", "Second message", "Latest message"];
        const onToggleExpand = jest.fn();

        const { getByText, queryByText, getByTestId } = await renderWithTheme(
            <InAppMessageNotification
                senderName="Alex Rivers"
                messages={messages}
                onToggleExpand={onToggleExpand}
            />
        );

        // In collapsed state, latest message is the preview
        expect(getByText("Latest message")).toBeTruthy();
        expect(queryByText("First message")).toBeNull();

        // Toggle to expand
        const toggleBtn = getByTestId("in-app-message-notification-toggle-button");
        fireEvent.press(toggleBtn);
        expect(onToggleExpand).toHaveBeenCalledWith(true);
    });

    it("handles missing avatar gracefully by displaying the application default avatar with initial", async () => {
        const { getByText } = await renderWithTheme(
            <InAppMessageNotification
                senderName="Morgan"
                senderAvatarUrl={null}
                messages={["Hello world"]}
            />
        );

        // Default avatar fallback renders the initial 'M'
        expect(getByText("M")).toBeTruthy();
        expect(getByText("Morgan")).toBeTruthy();
    });

    it("renders long messages that wrap naturally without breaking the layout", async () => {
        const longMessage =
            "This is an unusually long message that extends across multiple lines. It is designed to verify that the message container allows natural text wrapping rather than forcing text onto a single clipped line or expanding outside the notification boundaries.";

        const { getByText } = await renderWithTheme(
            <InAppMessageNotification
                senderName="Christopher Nolan"
                messages={[longMessage]}
                defaultExpanded={true}
            />
        );

        expect(getByText("Christopher Nolan")).toBeTruthy();
        expect(getByText(longMessage)).toBeTruthy();
    });

    it("invokes onDismiss callback when dismiss button is pressed", async () => {
        const onDismiss = jest.fn();
        const { getByTestId } = await renderWithTheme(
            <InAppMessageNotification
                senderName="Alice"
                messages={["Dismiss me please"]}
                onDismiss={onDismiss}
            />
        );

        const dismissBtn = getByTestId("in-app-message-notification-dismiss-button");
        fireEvent.press(dismissBtn);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("renders notification activity badge icon and custom count label for general notifications", async () => {
        const { getByText, getByTestId } = await renderWithTheme(
            <InAppMessageNotification
                senderName="Dave Miller"
                messages={["liked your post.", "commented on your post."]}
                countLabel="notifications"
                badgeIcon={
                    <NotificationTypeBadgeIcon
                        type="PostLike"
                        size={10}
                        color="#FFFFFF"
                    />
                }
                defaultExpanded={true}
            />
        );

        expect(getByText("Dave Miller")).toBeTruthy();
        expect(getByText("2 notifications")).toBeTruthy();
        expect(getByText("liked your post.")).toBeTruthy();
        expect(getByText("commented on your post.")).toBeTruthy();
    });
});
