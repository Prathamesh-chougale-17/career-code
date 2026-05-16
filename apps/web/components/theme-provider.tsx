"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  forcedTheme?: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  theme: Theme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
}: {
  attribute?: "class";
  children: ReactNode;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
  enableSystem?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("careeright-theme");
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      setThemeState(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () =>
      setSystemTheme(mediaQuery.matches ? "dark" : "light");

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);

    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, [enableSystem]);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      setTheme: (nextTheme) => {
        window.localStorage.setItem("careeright-theme", nextTheme);
        setThemeState(nextTheme);
      },
      theme,
    }),
    [resolvedTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useCareerightTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useCareerightTheme must be used within ThemeProvider.");
  }

  return context;
}
