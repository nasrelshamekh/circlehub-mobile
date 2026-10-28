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

        const btn = getByRole("button");
        expect(btn.props.className).toContain("rounded-xl");
        expect(btn.props.style).toEqual(
            expect.arrayContaining([{ borderRadius: 24 }])
        );
    });

    it("keeps the default radius when no className is passed", async () => {
        const { getByRole } = await renderWithTheme(
            <GradientButton label="Save" />
        );

        const btn = getByRole("button");
        expect(btn.props.className).toContain("rounded-xl");
        expect(btn.props.style).toEqual(
            expect.arrayContaining([{ borderRadius: 24 }])
        );
    });

    it("honours an explicit radius override", async () => {
        const { getByRole } = await renderWithTheme(
            <GradientButton label="Send" className="rounded-full" />
        );

        const btn = getByRole("button");
        const className = btn.props.className;
        expect(className).toContain("rounded-full");
        expect(className).not.toContain("rounded-xl");
        expect(btn.props.style).toEqual(
            expect.arrayContaining([{ borderRadius: 9999 }])
        );
    });

    it("supports custom rounded utility classes", async () => {
        const { getByRole } = await renderWithTheme(
            <GradientButton label="Custom" className="rounded-lg" />
        );

        const btn = getByRole("button");
        expect(btn.props.className).toContain("rounded-lg");
        expect(btn.props.style).toEqual(
            expect.arrayContaining([{ borderRadius: 16 }])
        );
    });
});
