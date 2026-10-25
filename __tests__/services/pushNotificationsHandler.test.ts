describe("Push notification foreground handler", () => {
    let capturedHandler: (() => Promise<any>) | null = null;

    beforeEach(() => {
        capturedHandler = null;
        jest.resetModules();
    });

    it("suppresses foreground expo alerts, banners, list items, sounds, and badges when app is opened", async () => {
        const mockSetNotificationHandler = jest.fn((options: { handleNotification: () => Promise<any> }) => {
            capturedHandler = options.handleNotification;
        });

        jest.doMock("expo-notifications", () => ({
            setNotificationHandler: mockSetNotificationHandler,
            AndroidImportance: { MAX: 5 },
            getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
            requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
            getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "ExpoPushToken[test]" }),
            setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
            getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
            addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
        }));

        // Mock react-native Platform.OS as android
        jest.doMock("react-native", () => ({
            Platform: { OS: "android" },
        }));

        // Mock expo-device
        jest.doMock("expo-device", () => ({
            isDevice: true,
        }));

        // Mock expo-constants
        jest.doMock("expo-constants", () => ({
            __esModule: true,
            default: {
                executionEnvironment: "bare",
                appOwnership: "standalone",
                expoConfig: { extra: { eas: { projectId: "test-id" } } },
            },
            ExecutionEnvironment: { StoreClient: "storeClient" },
        }));

        // Mock api/devices
        jest.doMock("@/api/devices", () => ({
            registerDeviceToken: jest.fn().mockResolvedValue({}),
            unregisterDeviceToken: jest.fn().mockResolvedValue({}),
        }));

        // Mock expo-secure-store
        jest.doMock("expo-secure-store", () => ({
            getItemAsync: jest.fn().mockResolvedValue(null),
            setItemAsync: jest.fn().mockResolvedValue(undefined),
            deleteItemAsync: jest.fn().mockResolvedValue(undefined),
        }));

        const pushService = require("@/services/pushNotifications");

        // Trigger token registration which calls getNotifications() if not already called
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
});
