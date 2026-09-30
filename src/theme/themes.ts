import { vars } from "nativewind";

export const themes = {
    light: vars({
        // Core
        "--button-gradient-text": "#ffffff",

        "--primary": "#4648d4",
        "--on-primary": "#ffffff",
        "--primary-container": "#6063ee",
        "--on-primary-container": "#fffbff",
        "--inverse-primary": "#c0c1ff",

        "--secondary": "#6b38d4",
        "--on-secondary": "#ffffff",
        "--secondary-container": "#8455ef",
        "--on-secondary-container": "#fffbff",

        "--tertiary": "#006577",
        "--on-tertiary": "#ffffff",
        "--tertiary-container": "#008096",
        "--on-tertiary-container": "#f9fdff",

        // Gradient
        "--primary-gradient-start": "#6366f1",
        "--primary-gradient-end": "#8b5cf6",

        // Background / surfaces
        "--background": "#faf8ff",
        "--on-background": "#131b2e",

        "--surface": "#faf8ff",
        "--surface-dim": "#d2d9f4",
        "--surface-bright": "#faf8ff",

        "--surface-lowest": "#ffffff",
        "--surface-low": "#f2f3ff",
        "--surface-container": "#eaedff",
        "--surface-high": "#e2e7ff",
        "--surface-highest": "#dae2fd",
        "--surface-variant": "#dae2fd",

        // Muted
        "--muted": "#dae2fd",
        "--muted-foreground": "#464554",

        // Inverse
        "--inverse-surface": "#283044",
        "--inverse-on-surface": "#eef0ff",

        "--surface-tint": "#494bd6",

        // Text
        "--text-primary": "#131b2e",
        "--text-secondary": "#464554",

        // Borders
        "--outline": "#767586",
        "--border": "#cdcbda",

        // Error
        "--error": "#ba1a1a",
        "--on-error": "#ffffff",
        "--error-container": "#ffdad6",
        "--on-error-container": "#93000a",

        // Primary soft
        "--primary-soft": "#e1e0ff",
        "--primary-soft-dim": "#c0c1ff",
        "--on-primary-soft": "#07006c",
        "--on-primary-soft-variant": "#2f2ebe",

        // Secondary soft
        "--secondary-soft": "#e9ddff",
        "--secondary-soft-dim": "#d0bcff",
        "--on-secondary-soft": "#23005c",
        "--on-secondary-soft-variant": "#5516be",

        // Tertiary soft
        "--tertiary-soft": "#acedff",
        "--tertiary-soft-dim": "#4cd7f6",
        "--on-tertiary-soft": "#001f26",
        "--on-tertiary-soft-variant": "#004e5c",

        // Interaction states
        "--hover": "rgba(99, 102, 241, 0.06)",
        "--active": "rgba(99, 102, 241, 0.12)",
        "--focus-ring": "rgba(99, 102, 241, 0.35)",

        // Shadows
        "--shadow-sm": "0 2px 8px rgba(99, 102, 241, 0.04)",
        "--shadow-md":
            "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)",
        "--shadow-lg":
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    }),

    dark: vars({
        // Core
        "--button-gradient-text": "#0b1326",

        "--primary": "#bdc2ff",
        "--on-primary": "#131e8c",
        "--primary-container": "#818cf8",
        "--on-primary-container": "#101b8a",
        "--inverse-primary": "#4953bc",

        "--secondary": "#cebdff",
        "--on-secondary": "#381385",
        "--secondary-container": "#4f319c",
        "--on-secondary-container": "#bea8ff",

        "--tertiary": "#f7bd3e",
        "--on-tertiary": "#402d00",
        "--tertiary-container": "#c08d00",
        "--on-tertiary-container": "#3e2b00",

        // Gradient
        "--primary-gradient-start": "#818cf8",
        "--primary-gradient-end": "#a78bfa",

        // Background / surfaces
        "--background": "#0b1326",
        "--on-background": "#dae2fd",

        "--surface": "#0b1326",
        "--surface-dim": "#0b1326",
        "--surface-bright": "#31394d",

        "--surface-lowest": "#060e20",
        "--surface-low": "#131b2e",
        "--surface-container": "#171f33",
        "--surface-high": "#222a3d",
        "--surface-highest": "#2d3449",
        "--surface-variant": "#2d3449",

        // Muted
        "--muted": "#2d3449",
        "--muted-foreground": "#c6c5d5",

        // Inverse
        "--inverse-surface": "#dae2fd",
        "--inverse-on-surface": "#283044",

        "--surface-tint": "#bdc2ff",

        // Text
        "--text-primary": "#dae2fd",
        "--text-secondary": "#c6c5d5",

        // Borders
        "--outline": "#908f9e",
        "--border": "#fafafd",

        // Error
        "--error": "#ffb4ab",
        "--on-error": "#690005",
        "--error-container": "#93000a",
        "--on-error-container": "#ffdad6",

        // Primary soft
        "--primary-soft": "#e0e0ff",
        "--primary-soft-dim": "#bdc2ff",
        "--on-primary-soft": "#000767",
        "--on-primary-soft-variant": "#2f3aa3",

        // Secondary soft
        "--secondary-soft": "#e8ddff",
        "--secondary-soft-dim": "#cebdff",
        "--on-secondary-soft": "#21005e",
        "--on-secondary-soft-variant": "#4f319c",

        // Tertiary soft
        "--tertiary-soft": "#ffdea3",
        "--tertiary-soft-dim": "#f7bd3e",
        "--on-tertiary-soft": "#261900",
        "--on-tertiary-soft-variant": "#5d4200",

        // Interaction states
        "--hover": "rgba(129, 140, 248, 0.12)",
        "--active": "rgba(129, 140, 248, 0.18)",
        "--focus-ring": "rgba(129, 140, 248, 0.2)",

        // Shadows
        "--shadow-sm": "none",
        "--shadow-md": "none",
        "--shadow-lg": "none",
    }),
};