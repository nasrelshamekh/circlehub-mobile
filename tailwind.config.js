/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],

    presets: [require("nativewind/preset")],

    darkMode: "class",

    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "var(--primary)",
                    container: "var(--primary-container)",
                    soft: "var(--primary-soft)",
                },

                "on-primary": "var(--on-primary)",
                "on-primary-container": "var(--on-primary-container)",
                "inverse-primary": "var(--inverse-primary)",

                secondary: {
                    DEFAULT: "var(--secondary)",
                    container: "var(--secondary-container)",
                    soft: "var(--secondary-soft)",
                },

                "on-secondary": "var(--on-secondary)",
                "on-secondary-container": "var(--on-secondary-container)",

                tertiary: {
                    DEFAULT: "var(--tertiary)",
                    container: "var(--tertiary-container)",
                    soft: "var(--tertiary-soft)",
                },

                "on-tertiary": "var(--on-tertiary)",
                "on-tertiary-container": "var(--on-tertiary-container)",

                background: "var(--background)",
                "on-background": "var(--on-background)",

                surface: {
                    DEFAULT: "var(--surface)",
                    dim: "var(--surface-dim)",
                    bright: "var(--surface-bright)",
                    lowest: "var(--surface-lowest)",
                    low: "var(--surface-low)",
                    container: "var(--surface-container)",
                    high: "var(--surface-high)",
                    highest: "var(--surface-highest)",
                    variant: "var(--surface-variant)",
                },

                muted: "var(--muted)",
                "muted-foreground": "var(--muted-foreground)",

                "inverse-surface": "var(--inverse-surface)",
                "inverse-on-surface": "var(--inverse-on-surface)",
                "surface-tint": "var(--surface-tint)",

                text: {
                    primary: "var(--text-primary)",
                    secondary: "var(--text-secondary)",
                },

                border: "var(--border)",
                outline: "var(--outline)",

                error: {
                    DEFAULT: "var(--error)",
                    container: "var(--error-container)",
                },

                "on-error": "var(--on-error)",
                "on-error-container": "var(--on-error-container)",

                "primary-soft-dim": "var(--primary-soft-dim)",
                "on-primary-soft": "var(--on-primary-soft)",
                "on-primary-soft-variant": "var(--on-primary-soft-variant)",

                "secondary-soft-dim": "var(--secondary-soft-dim)",
                "on-secondary-soft": "var(--on-secondary-soft)",
                "on-secondary-soft-variant": "var(--on-secondary-soft-variant)",

                "tertiary-soft-dim": "var(--tertiary-soft-dim)",
                "on-tertiary-soft": "var(--on-tertiary-soft)",
                "on-tertiary-soft-variant": "var(--on-tertiary-soft-variant)",

                hover: "var(--hover)",
                active: "var(--active)",
                "focus-ring": "var(--focus-ring)",

                "primary-gradient-start": "var(--primary-gradient-start)",
                "primary-gradient-end": "var(--primary-gradient-end)",
                "button-gradient-text": "var(--button-gradient-text)",
            },

            borderRadius: {
                sm: "4px",
                base: "8px",
                md: "12px",
                lg: "16px",
                xl: "24px",
                full: "9999px",
            },

            fontSize: {
                "display-lg": ["48px", { lineHeight: "56px" }],
                "headline-lg": ["32px", { lineHeight: "40px" }],
                "headline-md": ["24px", { lineHeight: "32px" }],
                "title-lg": ["20px", { lineHeight: "28px" }],
                "body-lg": ["18px", { lineHeight: "28px" }],
                "body-md": ["16px", { lineHeight: "24px" }],
                "body-sm": ["14px", { lineHeight: "20px" }],
                "label-md": ["14px", { lineHeight: "20px" }],
                "label-sm": ["12px", { lineHeight: "16px" }],
            },
        },
    },

    plugins: [],
};