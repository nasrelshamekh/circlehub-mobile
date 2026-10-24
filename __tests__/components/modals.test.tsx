import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import React from "react";

import ActionModal, { ActionOption } from "@/components/ui/actionmodal";
import AppLoadingScreen from "@/components/ui/apploadingscreen";
import ConfirmModal from "@/components/ui/confirmmodal";
import { ThemeProvider } from "@/context/themecontext";

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
});
