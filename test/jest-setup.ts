import { notifyManager } from "@tanstack/react-query";

// React Query batches notifications on a timer by default. Flushing them
// synchronously keeps query state updates inside act() and stops the timer
// from keeping Jest workers alive.
notifyManager.setScheduler((callback) => callback());

jest.mock("expo-navigation-bar", () => ({
    NavigationBar: () => null,
    setStyle: jest.fn(),
    setHidden: jest.fn(),
    setVisibilityAsync: jest.fn().mockResolvedValue(undefined),
    getVisibilityAsync: jest.fn().mockResolvedValue("visible"),
}));

jest.mock("expo-secure-store", () => {
    const store = new Map<string, string>();
    return {
        getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
        setItemAsync: jest.fn(async (key: string, value: string) => {
            store.set(key, value);
        }),
        deleteItemAsync: jest.fn(async (key: string) => {
            store.delete(key);
        }),
    };
});

jest.mock("expo-image", () => ({
    Image: "Image",
}));

jest.mock("expo-haptics", () => ({
    impactAsync: jest.fn().mockResolvedValue(undefined),
    notificationAsync: jest.fn().mockResolvedValue(undefined),
    selectionAsync: jest.fn().mockResolvedValue(undefined),
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

jest.mock("lucide-react-native", () => {
    return new Proxy(
        {},
        {
            get: (_, name) => {
                const IconComponent = () => null;
                IconComponent.displayName = String(name);
                return IconComponent;
            },
        }
    );
});
