import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { Alert, AlertButton, AlertOptions } from "react-native";

import ActionModal, { ActionOption } from "@/components/ui/actionmodal";
import ConfirmModal from "@/components/ui/confirmmodal";

type AlertConfig = {
    title: string;
    message?: string;
    buttons?: AlertButton[];
    options?: AlertOptions;
};

type AlertContextValue = {
    showAlert: (
        title: string,
        message?: string,
        buttons?: AlertButton[],
        options?: AlertOptions
    ) => void;
    hideAlert: () => void;
};

const AlertContext = createContext<AlertContextValue>({
    showAlert: () => {},
    hideAlert: () => {},
});

export function AlertProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<AlertConfig | null>(null);

    const hideAlert = useCallback(() => {
        setConfig(null);
    }, []);

    const showAlert = useCallback(
        (
            title: string,
            message?: string,
            buttons?: AlertButton[],
            options?: AlertOptions
        ) => {
            setConfig({ title, message, buttons, options });
        },
        []
    );

    useEffect(() => {
        const originalAlert = Alert.alert;

        Alert.alert = (
            title: string,
            message?: string,
            buttons?: AlertButton[],
            options?: AlertOptions
        ) => {
            showAlert(title, message, buttons, options);
        };

        return () => {
            Alert.alert = originalAlert;
        };
    }, [showAlert]);

    const buttons = config?.buttons;
    const isVisible = Boolean(config);

    // Case 1: Multiple actions (3 or more buttons)
    const isMultiAction = Boolean(buttons && buttons.length >= 3);

    // Case 2: Standard two-button confirmation dialog
    const isConfirm = Boolean(buttons && buttons.length === 2);

    // Case 3: Notice / Alert dialog (0 or 1 button)
    const isNotice = !isMultiAction && !isConfirm;

    // Helper for two-button modal
    const cancelBtn = buttons?.find((b) => b.style === "cancel") ?? buttons?.[0];
    const confirmBtn =
        buttons?.find((b) => b !== cancelBtn) ?? buttons?.[1] ?? buttons?.[0];

    const actionOptions: ActionOption[] = (buttons ?? []).map((b, index) => ({
        key: `action-${index}-${b.text ?? "action"}`,
        label: b.text ?? "OK",
        destructive: b.style === "destructive",
        onPress: () => {
            hideAlert();
            b.onPress?.();
        },
    }));

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}

            {/* Notice Modal (Single button: OK / Done) */}
            {isVisible && isNotice && (
                <ConfirmModal
                    visible={isVisible}
                    title={config?.title ?? ""}
                    message={config?.message}
                    showCancel={false}
                    confirmText={buttons?.[0]?.text ?? "OK"}
                    destructive={buttons?.[0]?.style === "destructive"}
                    onCancel={() => {
                        hideAlert();
                        buttons?.[0]?.onPress?.();
                        config?.options?.onDismiss?.();
                    }}
                    onConfirm={() => {
                        hideAlert();
                        buttons?.[0]?.onPress?.();
                    }}
                />
            )}

            {/* Confirm Modal (Cancel + Confirm) */}
            {isVisible && isConfirm && (
                <ConfirmModal
                    visible={isVisible}
                    title={config?.title ?? ""}
                    message={config?.message}
                    showCancel={true}
                    cancelText={cancelBtn?.text ?? "Cancel"}
                    confirmText={confirmBtn?.text ?? "Confirm"}
                    destructive={confirmBtn?.style === "destructive"}
                    onCancel={() => {
                        hideAlert();
                        cancelBtn?.onPress?.();
                        config?.options?.onDismiss?.();
                    }}
                    onConfirm={() => {
                        hideAlert();
                        confirmBtn?.onPress?.();
                    }}
                />
            )}

            {/* Action Modal (3+ buttons) */}
            {isVisible && isMultiAction && (
                <ActionModal
                    visible={isVisible}
                    title={config?.title}
                    options={actionOptions}
                    onClose={() => {
                        hideAlert();
                        config?.options?.onDismiss?.();
                    }}
                />
            )}
        </AlertContext.Provider>
    );
}

export function useAlert() {
    return useContext(AlertContext);
}
