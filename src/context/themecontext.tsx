import * as SecureStore from "expo-secure-store";
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

const THEME_STORAGE_KEY = "circlehub_user_theme";

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
        let mounted = true;
        SecureStore.getItemAsync(THEME_STORAGE_KEY)
            .then((saved) => {
                if (mounted && (saved === "light" || saved === "dark")) {
                    setIsManual(true);
                    setScheme(saved);
                    nativeColorScheme.set(saved);
                }
            })
            .catch(() => {});

        return () => {
            mounted = false;
        };
    }, []);

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
            SecureStore.setItemAsync(THEME_STORAGE_KEY, next).catch(() => {});
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
