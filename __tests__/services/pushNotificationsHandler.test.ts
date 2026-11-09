describe("Push notification handler & Android status bar dismissal", () => {
    let capturedHandler: (() => Promise<any>) | null = null;
    let mockGetPresentedNotificationsAsync: jest.Mock;
    let mockDismissNotificationAsync: jest.Mock;
    let mockDismissAllNotificationsAsync: jest.Mock;
    let mockSetBadgeCountAsync: jest.Mock;

    let mockDisplayDiscordActivityNotification: jest.Mock;
    let mockDisplayDiscordMessageNotification: jest.Mock;

    function loadPushService() {
        mockGetPresentedNotificationsAsync = jest.fn().mockResolvedValue([]);
        mockDismissNotificationAsync = jest.fn().mockResolvedValue(undefined);
        mockDismissAllNotificationsAsync = jest.fn().mockResolvedValue(undefined);
        mockSetBadgeCountAsync = jest.fn().mockResolvedValue(undefined);
        mockDisplayDiscordActivityNotification = jest.fn().mockResolvedValue("test-notif-id");
        mockDisplayDiscordMessageNotification = jest.fn().mockResolvedValue("test-id");

        const mockSetNotificationHandler = jest.fn(
            (options: { handleNotification: () => Promise<any> }) => {
                capturedHandler = options.handleNotification;
            }
        );

        jest.doMock("expo-notifications", () => ({
            setNotificationHandler: mockSetNotificationHandler,
            AndroidImportance: { MAX: 5 },
            getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
            requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
            getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "ExpoPushToken[test]" }),
            setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
            getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
            addNotificationResponseReceivedListener: jest
                .fn()
                .mockReturnValue({ remove: jest.fn() }),
            getPresentedNotificationsAsync: mockGetPresentedNotificationsAsync,
            dismissNotificationAsync: mockDismissNotificationAsync,
            dismissAllNotificationsAsync: mockDismissAllNotificationsAsync,
            setBadgeCountAsync: mockSetBadgeCountAsync,
        }));

        jest.doMock("react-native", () => ({
            Platform: { OS: "android" },
        }));

        jest.doMock("expo-device", () => ({
            isDevice: true,
        }));

        jest.doMock("expo-constants", () => ({
            __esModule: true,
            default: {
                executionEnvironment: "bare",
                appOwnership: "standalone",
                expoConfig: { extra: { eas: { projectId: "test-id" } } },
            },
            ExecutionEnvironment: { StoreClient: "storeClient" },
        }));

        jest.doMock("@/api/devices", () => ({
            registerDeviceToken: jest.fn().mockResolvedValue({}),
            unregisterDeviceToken: jest.fn().mockResolvedValue({}),
        }));

        jest.doMock("expo-secure-store", () => ({
            getItemAsync: jest.fn().mockResolvedValue("ExpoPushToken[test]"),
            setItemAsync: jest.fn().mockResolvedValue(undefined),
            deleteItemAsync: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock("@/services/discordNotificationService", () => ({
            initializeNotificationChannels: jest.fn().mockResolvedValue(undefined),
            displayDiscordMessageNotification: mockDisplayDiscordMessageNotification,
            displayDiscordActivityNotification: mockDisplayDiscordActivityNotification,
            dismissDiscordConversationNotification: jest.fn().mockResolvedValue(undefined),
            dismissDiscordActivityNotification: jest.fn().mockResolvedValue(undefined),
            dismissAllDiscordNotifications: jest.fn().mockResolvedValue(undefined),
            registerDiscordBackgroundEventHandler: jest.fn(),
            registerDiscordForegroundEventHandler: jest.fn().mockReturnValue(() => {}),
        }));

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pushService = require("@/services/pushNotifications");
        return {
            pushService,
            mockSetNotificationHandler,
            mockDisplayDiscordActivityNotification,
            mockDisplayDiscordMessageNotification,
        };
    }

    beforeEach(() => {
        capturedHandler = null;
        jest.resetModules();
    });

    it("suppresses foreground expo alerts, banners, list items, sounds, and badges when app is opened", async () => {
        const { pushService, mockSetNotificationHandler } = loadPushService();

        await pushService.registerCurrentDevicePushToken();

        expect(mockSetNotificationHandler).toHaveBeenCalled();
        expect(capturedHandler).not.toBeNull();

        const behavior = await capturedHandler!();
        expect(behavior).toEqual({
            shouldShowAlert: false,
            shouldShowBanner: false,
            shouldShowList: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
        });
    });

    it("dismisses only status-bar notifications belonging to the opened conversation", async () => {
        const { pushService } = loadPushService();

        mockGetPresentedNotificationsAsync.mockResolvedValue([
            {
                date: 1,
                request: {
                    identifier: "0:msg-1",
                    content: {
                        data: {
                            type: "message",
                            conversationId: "CONV-AAA",
                            senderId: "user-1",
                            tag: "chat_CONV-AAA",
                        },
                    },
                    trigger: { type: "push", channelId: "messages" },
                },
            },
            {
                date: 2,
                request: {
                    identifier:
                        "expo-notifications://foreign_notifications?tag=chat_conv-aaa&id=0",
                    content: {
                        data: {
                            body: JSON.stringify({
                                type: "message",
                                conversationId: "conv-aaa",
                            }),
                        },
                    },
                    trigger: null,
                },
            },
            {
                date: 3,
                request: {
                    identifier: "0:msg-other",
                    content: {
                        data: {
                            type: "message",
                            conversationId: "conv-bbb",
                            senderId: "user-2",
                        },
                    },
                    trigger: { type: "push", channelId: "messages" },
                },
            },
            {
                date: 4,
                request: {
                    identifier: "0:notif-like",
                    content: {
                        data: {
                            type: "notification",
                            notificationId: "notif-1",
                            notificationType: "PostLike",
                        },
                    },
                    trigger: { type: "push", channelId: "default" },
                },
            },
        ]);

        await pushService.dismissConversationNotifications("conv-aaa");

        expect(mockDismissNotificationAsync).toHaveBeenCalledTimes(2);
        expect(mockDismissNotificationAsync).toHaveBeenCalledWith("0:msg-1");
        expect(mockDismissNotificationAsync).toHaveBeenCalledWith(
            "expo-notifications://foreign_notifications?tag=chat_conv-aaa&id=0"
        );
        expect(mockSetBadgeCountAsync).not.toHaveBeenCalled();
    });

    it("dismisses all general activity notifications when visiting the notifications page while keeping unread chat notifications", async () => {
        const { pushService } = loadPushService();

        mockGetPresentedNotificationsAsync.mockResolvedValue([
            {
                date: 1,
                request: {
                    identifier: "0:notif-like",
                    content: {
                        data: {
                            type: "notification",
                            notificationId: "notif-1",
                            notificationType: "PostLike",
                        },
                    },
                    trigger: { type: "push", channelId: "default" },
                },
            },
            {
                date: 2,
                request: {
                    identifier: "0:notif-follow",
                    content: {
                        data: {
                            type: "notification",
                            notificationId: "notif-2",
                            notificationType: "Follow",
                        },
                    },
                    trigger: { type: "push", channelId: "default" },
                },
            },
            {
                date: 3,
                request: {
                    identifier: "chat_conv-bbb",
                    content: {
                        data: {
                            type: "message",
                            conversationId: "conv-bbb",
                        },
                    },
                    trigger: { type: "push", channelId: "messages" },
                },
            },
        ]);

        await pushService.dismissActivityNotifications();

        expect(mockDismissNotificationAsync).toHaveBeenCalledTimes(2);
        expect(mockDismissNotificationAsync).toHaveBeenCalledWith("0:notif-like");
        expect(mockDismissNotificationAsync).toHaveBeenCalledWith("0:notif-follow");
        expect(mockDismissNotificationAsync).not.toHaveBeenCalledWith("chat_conv-bbb");
    });

    it("resets launcher badge when dismissing the last notification and clears all on sign-out", async () => {
        const { pushService } = loadPushService();

        mockGetPresentedNotificationsAsync.mockResolvedValue([
            {
                date: 1,
                request: {
                    identifier: "0:notif-only",
                    content: {
                        data: {
                            type: "notification",
                            notificationId: "notif-99",
                        },
                    },
                    trigger: { type: "push", channelId: "default" },
                },
            },
        ]);

        await pushService.dismissActivityNotifications("notif-99");
        expect(mockDismissNotificationAsync).toHaveBeenCalledWith("0:notif-only");
        expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0);

        await pushService.unregisterCurrentDevicePushToken();
        expect(mockDismissAllNotificationsAsync).toHaveBeenCalledTimes(1);
    });

    it("correctly unpacks stringified JSON body and prevents rendering raw code in activity notifications", async () => {
        const { pushService, mockDisplayDiscordActivityNotification } =
            loadPushService();

        // Android / Expo FCM payload where `body` is a stringified JSON object
        const rawFcmData = {
            body: JSON.stringify({
                type: "notification",
                notificationId: "notif-777",
                notificationType: "PostLike",
                senderName: "Sarah Connor",
                text: "Sarah Connor liked your post.",
                postId: "post-100",
                actorUsername: "sarah",
            }),
        };

        const unpacked = pushService.unpackPayload(rawFcmData);
        expect(unpacked.type).toBe("notification");
        expect(unpacked.notificationId).toBe("notif-777");
        expect(unpacked.notificationType).toBe("PostLike");
        expect(unpacked.senderName).toBe("Sarah Connor");
        expect(unpacked.text).toBe("Sarah Connor liked your post.");

        await pushService.handleIncomingDiscordPayload(rawFcmData);

        expect(mockDisplayDiscordActivityNotification).toHaveBeenCalledTimes(1);
        expect(mockDisplayDiscordActivityNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                notificationId: "notif-777",
                notificationType: "PostLike",
                senderName: "Sarah Connor",
                text: "Sarah Connor liked your post.",
                postId: "post-100",
                actorUsername: "sarah",
            })
        );
        // Ensure no raw JSON was passed
        const payloadPassed =
            mockDisplayDiscordActivityNotification.mock.calls[0][0];
        expect(payloadPassed.text).not.toContain("{");
        expect(payloadPassed.senderName).not.toContain("{");
    });

    it("synthesizes clean human sentence when raw text is missing or contains code", async () => {
        const { pushService, mockDisplayDiscordActivityNotification } =
            loadPushService();

        const rawData = {
            body: JSON.stringify({
                type: "notification",
                notificationId: "notif-888",
                notificationType: "CommentLike",
                senderName: "John Connor",
                // Simulate an corrupted / raw code string in text
                text: '{"corrupted":"json"}',
            }),
        };

        await pushService.handleIncomingDiscordPayload(rawData);

        expect(mockDisplayDiscordActivityNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                notificationId: "notif-888",
                notificationType: "CommentLike",
                senderName: "John Connor",
                text: "John Connor liked your comment.",
            })
        );
    });

    it("correctly unpacks stringified message payload and avoids rendering JSON code", async () => {
        const { pushService, mockDisplayDiscordMessageNotification } =
            loadPushService();

        const rawFcmMessage = {
            body: JSON.stringify({
                type: "message",
                conversationId: "conv-xyz",
                messageId: "msg-999",
                senderName: "Alice",
                senderUsername: "alice",
                text: "Hey, are you free tomorrow?",
            }),
        };

        await pushService.handleIncomingDiscordPayload(rawFcmMessage);

        expect(mockDisplayDiscordMessageNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                conversationId: "conv-xyz",
                messageId: "msg-999",
                senderName: "Alice",
                recipientUsername: "alice",
                text: "Hey, are you free tomorrow?",
            })
        );
    });
});
