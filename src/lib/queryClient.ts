import NetInfo from "@react-native-community/netinfo";
import {
    focusManager,
    onlineManager,
    QueryClient,
} from "@tanstack/react-query";
import { AppState, Platform, type AppStateStatus } from "react-native";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
        },
        mutations: {
            retry: 0,
        },
    },
});

// React Native has no `window` focus events. Wire React Query's focus
// manager to AppState: the app is "focused" while in the foreground. On web the
// default (window focus) already applies.
if (Platform.OS !== "web") {
    focusManager.setEventListener((handleFocus) => {
        const subscription = AppState.addEventListener(
            "change",
            (status: AppStateStatus) => {
                handleFocus(status === "active");
            }
        );

        return () => subscription.remove();
    });
}

// NetInfo drives `onlineManager` so queries pause while the device is offline
// and resume/refetch when connectivity returns. On web the default is fine.
if (Platform.OS !== "web") {
    onlineManager.setEventListener((setOnline) =>
        NetInfo.addEventListener((state) => {
            setOnline(Boolean(state.isConnected));
        })
    );
}