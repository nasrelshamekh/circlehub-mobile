import notifee, {
    AndroidCategory,
    AndroidImportance,
    AndroidStyle,
    AuthorizationStatus,
} from "react-native-notify-kit";
import { router } from "expo-router";
import {
    ACTIVITY_CHANNEL_ID,
    checkNotificationPermissionStatus,
    displayDiscordActivityNotification,
    displayDiscordMessageNotification,
    handleInitialDiscordNotification,
    MESSAGES_CHANNEL_ID,
    navigateToActivityTarget,
    navigateToConversation,
} from "@/services/discordNotificationService";

const mockRouterPush = jest.fn();
jest.mock("expo-router", () => ({
    router: {
        push: (...args: unknown[]) => mockRouterPush(...args),
        replace: jest.fn(),
        navigate: jest.fn(),
    },
}));

jest.mock("@/api/notifications", () => ({
    markNotificationRead: jest.fn().mockResolvedValue({}),
}));

describe("Discord Notification Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("displays a 1-on-1 direct message without 'title' in MessagingStyle and with launchActivity", async () => {
        await displayDiscordMessageNotification({
            conversationId: "test-conv-1",
            messageId: "msg-1",
            senderName: "Sarah Connor",
            senderAvatarUrl: "https://example.com/avatar.png",
            text: "Hello there!",
        });

        expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
        const callArgs = (notifee.displayNotification as jest.Mock).mock.calls[0][0];

        // Android options checks
        expect(callArgs.android.channelId).toBe(MESSAGES_CHANNEL_ID);
        expect(callArgs.android.importance).toBe(AndroidImportance.HIGH);
        expect(callArgs.android.color).toBe("#5865F2");
        expect(callArgs.android.pressAction).toEqual({
            id: "default",
            launchActivity: "default",
        });

        // MessagingStyle checks
        const style = callArgs.android.style;
        expect(style.type).toBe(AndroidStyle.MESSAGING);
        expect(style.group).toBe(false);

        // Crucial: 'title' property MUST NOT exist on style for 1-on-1 chats
        expect("title" in style).toBe(false);

        // Message checks
        expect(style.messages).toHaveLength(1);
        expect(style.messages[0].text).toBe("Hello there!");
        expect(style.messages[0].person.name).toBe("Sarah Connor");
        expect(style.messages[0].person.icon).toBe("https://example.com/avatar.png");

        // Action checks
        expect(callArgs.android.actions).toHaveLength(2);
        expect(callArgs.android.actions[0].title).toBe("Reply");
        expect(callArgs.android.actions[0].input).toEqual(
            expect.objectContaining({ allowFreeFormInput: true })
        );
        expect(callArgs.android.actions[1].title).toBe("Mark as Read");
    });

    it("displays a group message with 'title' in MessagingStyle", async () => {
        await displayDiscordMessageNotification({
            conversationId: "group-conv-1",
            messageId: "msg-2",
            senderName: "John Connor",
            communityName: "Resistance",
            channelName: "announcements",
            text: "Assemble!",
        });

        expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
        const callArgs = (notifee.displayNotification as jest.Mock).mock.calls[0][0];

        const style = callArgs.android.style;
        expect(style.group).toBe(true);
        expect(style.title).toBe("#announcements • Resistance");

        // When avatar is omitted, 'icon' property MUST NOT exist on person
        expect("icon" in style.messages[0].person).toBe(false);
    });

    it("displays an activity notification with Discord Blurple styling, largeIcon avatar and BigText", async () => {
        await displayDiscordActivityNotification({
            notificationId: "notif-99",
            notificationType: "PostLike",
            senderName: "Kyle Reese",
            senderAvatarUrl: "https://example.com/kyle.png",
            text: "Kyle Reese liked your post.",
            postId: "post-123",
        });

        expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
        const callArgs = (notifee.displayNotification as jest.Mock).mock.calls[0][0];

        expect(callArgs.android.channelId).toBe(ACTIVITY_CHANNEL_ID);
        expect(callArgs.android.color).toBe("#5865F2");
        expect(callArgs.android.largeIcon).toBe("https://example.com/kyle.png");
        expect(callArgs.android.pressAction).toEqual({
            id: "default",
            launchActivity: "default",
        });

        const style = callArgs.android.style;
        expect(style.type).toBe(AndroidStyle.BIGTEXT);
        expect(style.text).toBe("Kyle Reese liked your post.");
        expect(style.title).toBe("Kyle Reese");

        expect(callArgs.android.actions).toHaveLength(2);
        expect(callArgs.android.actions[0].title).toBe("View");
        expect(callArgs.android.actions[0].pressAction.launchActivity).toBe("default");
        expect(callArgs.android.actions[1].title).toBe("Dismiss");
    });

    it("checks notification permission status correctly", async () => {
        (notifee.getNotificationSettings as jest.Mock).mockResolvedValueOnce({
            authorizationStatus: AuthorizationStatus.AUTHORIZED,
        });
        (notifee.getChannel as jest.Mock).mockResolvedValueOnce({
            id: MESSAGES_CHANNEL_ID,
            blocked: false,
        });

        const status = await checkNotificationPermissionStatus();
        expect(status.enabled).toBe(true);
        expect(status.channelBlocked).toBe(false);
    });

    it("navigates to conversation when navigateToConversation is called", () => {
        navigateToConversation("conv-42", "Sarah Connor", "https://example.com/a.png");
        jest.advanceTimersByTime(250);

        expect(mockRouterPush).toHaveBeenCalledWith({
            pathname: "/messages/[id]",
            params: {
                id: "conv-42",
                name: "Sarah Connor",
                avatarUrl: "https://example.com/a.png",
            },
        });
    });

    it("navigates to activity targets correctly", () => {
        // Follow target -> profile
        navigateToActivityTarget({
            notificationId: "n1",
            notificationType: "Follow",
            actorUsername: "sarah_c",
        });
        jest.advanceTimersByTime(250);
        expect(mockRouterPush).toHaveBeenCalledWith({
            pathname: "/profile/[username]",
            params: { username: "sarah_c" },
        });

        // PostLike target -> post
        navigateToActivityTarget({
            notificationId: "n2",
            notificationType: "PostLike",
            postId: "post-88",
        });
        jest.advanceTimersByTime(250);
        expect(mockRouterPush).toHaveBeenCalledWith({
            pathname: "/post/[id]",
            params: { id: "post-88" },
        });

        // Community target -> community
        navigateToActivityTarget({
            notificationId: "n3",
            notificationType: "CommunityRoleChanged",
            communitySlug: "cyberpunk",
        });
        jest.advanceTimersByTime(250);
        expect(mockRouterPush).toHaveBeenCalledWith({
            pathname: "/community/[slug]",
            params: { slug: "cyberpunk" },
        });
    });

    it("handles initial notification on cold boot", async () => {
        (notifee.getInitialNotification as jest.Mock).mockResolvedValueOnce({
            notification: {
                data: {
                    conversationId: "cold-boot-conv",
                    senderName: "Sarah",
                },
            },
        });

        await handleInitialDiscordNotification();
        jest.advanceTimersByTime(250);

        expect(mockRouterPush).toHaveBeenCalledWith({
            pathname: "/messages/[id]",
            params: {
                id: "cold-boot-conv",
                name: "Sarah",
            },
        });
    });
});
