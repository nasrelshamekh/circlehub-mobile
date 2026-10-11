import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
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

// React Native has no window focus events; treat foreground as focused.
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

// NetInfo drives onlineManager so queries pause offline and refetch on reconnect.
if (Platform.OS !== "web") {
    onlineManager.setEventListener((setOnline) =>
        NetInfo.addEventListener((state) => {
            setOnline(Boolean(state.isConnected));
        })
    );
}
