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

if (Platform.OS !== "web") {
    onlineManager.setEventListener((setOnline) =>
        NetInfo.addEventListener((state) => {
            setOnline(Boolean(state.isConnected));
        })
    );
}
