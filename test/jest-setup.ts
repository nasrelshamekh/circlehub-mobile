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

jest.mock("lucide-react-native", () => ({
    ChevronDown: () => null,
    ChevronUp: () => null,
    X: () => null,
    RotateCcw: () => null,
    Send: () => null,
    Smile: () => null,
    ChevronLeft: () => null,
    Pencil: () => null,
    Trash2: () => null,
}));

