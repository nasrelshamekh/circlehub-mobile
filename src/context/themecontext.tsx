import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Appearance } from "react-native";

import { colorScheme as nativeColorScheme } from "nativewind";

type ColorScheme = "light" | "dark";

type ThemeContextValue = {
    isDark: boolean;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
    // Fallback for trees rendered outside the provider, e.g. the root error
    // boundary, which sits above `RootLayout`.
    isDark: Appearance.getColorScheme() === "dark",
    toggleTheme: () => {},
});

function systemColorScheme(): ColorScheme {
    return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Hold the scheme in local state so the app repaints on the next frame.
    // Reading it back from NativeWind means waiting for the OS to echo the
    // change through `Appearance`, which can take a couple of seconds on
    // Android.
    const [scheme, setScheme] = useState<ColorScheme>(systemColorScheme);
    const [isManual, setIsManual] = useState(false);

    // Until the user picks a theme, keep following the device settings.
    useEffect(() => {
        if (isManual) return;

        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setScheme(colorScheme === "dark" ? "dark" : "light");
        });

        return () => subscription.remove();
    }, [isManual]);

    const toggleTheme = useCallback(() => {
        const next: ColorScheme = scheme === "dark" ? "light" : "dark";

        setIsManual(true);
        setScheme(next);

        // Reflect the choice onto NativeWind so its `dark:` utilities and the
        // native chrome follow along. This part is asynchronous on Android, but
        // the app no longer waits for it before repainting.
        nativeColorScheme.set(next);
    }, [scheme]);

    const value = useMemo(
        () => ({ isDark: scheme === "dark", toggleTheme }),
        [scheme, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
