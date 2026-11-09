import notifee, {
    AndroidCategory,
    AndroidImportance,
    AndroidStyle,
    AuthorizationStatus,
} from "react-native-notify-kit";
import {
    checkNotificationPermissionStatus,
    displayDiscordMessageNotification,
    MESSAGES_CHANNEL_ID,
} from "@/services/discordNotificationService";

describe("Discord Notification Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("displays a 1-on-1 direct message without 'title' in MessagingStyle", async () => {
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
});
