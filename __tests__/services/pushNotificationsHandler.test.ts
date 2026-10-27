describe("Push notification handler & Android status bar dismissal", () => {
    let capturedHandler: (() => Promise<any>) | null = null;
    let mockGetPresentedNotificationsAsync: jest.Mock;
    let mockDismissNotificationAsync: jest.Mock;
    let mockDismissAllNotificationsAsync: jest.Mock;
    let mockSetBadgeCountAsync: jest.Mock;

    function loadPushService() {
        mockGetPresentedNotificationsAsync = jest.fn().mockResolvedValue([]);
        mockDismissNotificationAsync = jest.fn().mockResolvedValue(undefined);
        mockDismissAllNotificationsAsync = jest.fn().mockResolvedValue(undefined);
        mockSetBadgeCountAsync = jest.fn().mockResolvedValue(undefined);

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

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pushService = require("@/services/pushNotifications");
        return { pushService, mockSetNotificationHandler };
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
});
