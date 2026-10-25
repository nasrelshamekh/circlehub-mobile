import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import React from "react";

import ActionModal, { ActionOption } from "@/components/ui/actionmodal";
import AlertModal from "@/components/ui/alertmodal";
import AppLoadingScreen from "@/components/ui/apploadingscreen";
import ConfirmModal from "@/components/ui/confirmmodal";
import { AlertProvider } from "@/context/alertcontext";
import { ThemeProvider } from "@/context/themecontext";
import { Alert, Pressable, Text } from "react-native";

async function renderWithTheme(ui: React.ReactElement) {
    let result: any;
    await act(async () => {
        result = render(<ThemeProvider>{ui}</ThemeProvider>);
    });
    return result;
}

afterEach(() => {
    cleanup();
});

describe("AppLoadingScreen", () => {
    it("renders the loading screen with logo and indicator", async () => {
        const view = await renderWithTheme(<AppLoadingScreen />);
        expect(view.toJSON()).toBeTruthy();
    });
});

describe("ActionModal", () => {
    it("renders title, options, and responds to click and cancel", async () => {
        const onSelect = jest.fn();
        const onClose = jest.fn();

        const options: ActionOption[] = [
            { key: "edit", label: "Edit post", onPress: onSelect },
            { key: "delete", label: "Delete post", destructive: true, onPress: jest.fn() },
        ];

        const { getByText } = await renderWithTheme(
            <ActionModal
                visible={true}
                title="Post options"
                options={options}
                onClose={onClose}
            />
        );

        expect(getByText("Post options")).toBeTruthy();
        expect(getByText("Edit post")).toBeTruthy();
        expect(getByText("Delete post")).toBeTruthy();

        await act(async () => {
            fireEvent.press(getByText("Edit post"));
        });
        expect(onClose).toHaveBeenCalled();
        expect(onSelect).toHaveBeenCalled();

        await act(async () => {
            fireEvent.press(getByText("Cancel"));
        });
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

describe("ConfirmModal", () => {
    it("renders confirmation details and triggers onConfirm and onCancel", async () => {
        const onConfirm = jest.fn();
        const onCancel = jest.fn();

        const { getByText } = await renderWithTheme(
            <ConfirmModal
                visible={true}
                title="Delete post?"
                message="Are you sure you want to delete this post?"
                confirmText="Delete"
                cancelText="Cancel"
                destructive
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );

        expect(getByText("Delete post?")).toBeTruthy();
        expect(getByText("Are you sure you want to delete this post?")).toBeTruthy();

        await act(async () => {
            fireEvent.press(getByText("Cancel"));
        });
        expect(onCancel).toHaveBeenCalled();

        await act(async () => {
            fireEvent.press(getByText("Delete"));
        });
        expect(onConfirm).toHaveBeenCalled();
    });

    it("renders single button notice when showCancel is false", async () => {
        const onConfirm = jest.fn();

        const { getByText, queryByText } = await renderWithTheme(
            <ConfirmModal
                visible={true}
                title="Notice"
                message="Your changes have been saved."
                showCancel={false}
                confirmText="Done"
                onConfirm={onConfirm}
                onCancel={jest.fn()}
            />
        );

        expect(getByText("Notice")).toBeTruthy();
        expect(getByText("Your changes have been saved.")).toBeTruthy();
        expect(getByText("Done")).toBeTruthy();
        expect(queryByText("Cancel")).toBeNull();

        await act(async () => {
            fireEvent.press(getByText("Done"));
        });
        expect(onConfirm).toHaveBeenCalled();
    });
});

describe("AlertModal", () => {
    it("renders as single-button notice modal and handles dismiss", async () => {
        const onClose = jest.fn();

        const { getByText, queryByText } = await renderWithTheme(
            <AlertModal
                visible={true}
                title="Recovery complete"
                message="Your recovery phrase was verified."
                buttonText="Done"
                onClose={onClose}
            />
        );

        expect(getByText("Recovery complete")).toBeTruthy();
        expect(getByText("Your recovery phrase was verified.")).toBeTruthy();
        expect(getByText("Done")).toBeTruthy();
        expect(queryByText("Cancel")).toBeNull();

        await act(async () => {
            fireEvent.press(getByText("Done"));
        });
        expect(onClose).toHaveBeenCalled();
    });
});

describe("AlertProvider (Global Alert Interceptor)", () => {
    function TestConsumer() {
        return (
            <Pressable
                onPress={() => {
                    Alert.alert("Settings saved", "Your preferences have been updated.", [
                        { text: "Done" },
                    ]);
                }}
            >
                <Text>Trigger Save Alert</Text>
            </Pressable>
        );
    }

    it("intercepts Alert.alert and renders in-app themed modal", async () => {
        const { getByText } = await renderWithTheme(
            <AlertProvider>
                <TestConsumer />
            </AlertProvider>
        );

        expect(getByText("Trigger Save Alert")).toBeTruthy();

        // Fire Alert.alert
        await act(async () => {
            fireEvent.press(getByText("Trigger Save Alert"));
        });

        // The in-app modal renders with title, message, and button
        expect(getByText("Settings saved")).toBeTruthy();
        expect(getByText("Your preferences have been updated.")).toBeTruthy();
        expect(getByText("Done")).toBeTruthy();

        // Tapping Done closes the in-app modal
        await act(async () => {
            fireEvent.press(getByText("Done"));
        });
    });
});
