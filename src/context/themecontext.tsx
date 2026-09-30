import { createContext, useContext } from "react";
import { useColorScheme } from "nativewind";

type ThemeContextType = {
    isDark: boolean;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { colorScheme, toggleColorScheme } = useColorScheme();

    const isDark = colorScheme === "dark";

    return (
        <ThemeContext.Provider
            value={{
                isDark,
                toggleTheme: toggleColorScheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used inside ThemeProvider");
    }

    return context;
}