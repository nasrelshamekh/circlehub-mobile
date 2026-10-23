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
    isDark: Appearance.getColorScheme() === "dark",
    toggleTheme: () => {},
});

function systemColorScheme(): ColorScheme {
    return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [scheme, setScheme] = useState<ColorScheme>(systemColorScheme);
    const [isManual, setIsManual] = useState(false);

    useEffect(() => {
        if (isManual) return;

        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setScheme(colorScheme === "dark" ? "dark" : "light");
        });

        return () => subscription.remove();
    }, [isManual]);

    const toggleTheme = useCallback(() => {
        setScheme((current) => {
            const next: ColorScheme = current === "dark" ? "light" : "dark";
            setIsManual(true);
            nativeColorScheme.set(next);
            return next;
        });
    }, []);

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
