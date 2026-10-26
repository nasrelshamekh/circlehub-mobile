import { act, cleanup, render } from "@testing-library/react-native";
import React from "react";

import RichText from "@/components/common/richtext";
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

describe("RichText", () => {
    it("renders plain text correctly", async () => {
        const view = await renderWithTheme(<RichText text="Hello world" />);
        expect(view.getByText("Hello world")).toBeTruthy();
    });

    it("renders mentions, hashtags and links", async () => {
        const view = await renderWithTheme(
            <RichText text="Hey @alice check #awesome at https://circlehub.app" />
        );
        expect(view.getByText("@alice")).toBeTruthy();
        expect(view.getByText("#awesome")).toBeTruthy();
        expect(view.getByText("https://circlehub.app")).toBeTruthy();
    });

    it("handles null or undefined gracefully", async () => {
        const view = await renderWithTheme(<RichText text={null} />);
        expect(view.toJSON()).toBeNull();
    });
});
