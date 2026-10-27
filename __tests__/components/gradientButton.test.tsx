import { act, render } from "@testing-library/react-native";
import React from "react";

import GradientButton from "@/components/ui/gradientbutton";
import { ThemeProvider } from "@/context/themecontext";

async function renderWithTheme(ui: React.ReactElement) {
    let result: any;
    await act(async () => {
        result = render(<ThemeProvider>{ui}</ThemeProvider>);
    });
    return result;
}

describe("GradientButton radius", () => {
    it("keeps the app button radius when only layout classes are passed", async () => {
        const { getByRole } = await renderWithTheme(
            <GradientButton label="Unlock" className="flex-1" />
        );

        expect(getByRole("button").props.className).toContain("rounded-xl");
    });

    it("keeps the default radius when no className is passed", async () => {
        const { getByRole } = await renderWithTheme(
            <GradientButton label="Save" />
        );

        expect(getByRole("button").props.className).toContain("rounded-xl");
    });

    it("honours an explicit radius override", async () => {
        const { getByRole } = await renderWithTheme(
            <GradientButton label="Send" className="rounded-full" />
        );

        const className = getByRole("button").props.className;
        expect(className).toContain("rounded-full");
        expect(className).not.toContain("rounded-xl");
    });
});
