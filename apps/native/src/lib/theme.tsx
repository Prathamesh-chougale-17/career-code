import React, { createContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

type ThemeMode = "system" | "light" | "dark";

type AppTheme = {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof lightColors;
  setMode: (mode: ThemeMode) => void;
};

const themeStorageKey = "careeright-theme-mode";

const lightColors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F4F5",
  surfaceStrong: "#E6EEF0",
  text: "#162124",
  textMuted: "#617074",
  border: "#D8E1E3",
  primary: "#0F9F8E",
  primarySoft: "#DDF7F2",
  accent: "#F59E0B",
  accentSoft: "#FFF1D6",
  danger: "#D92D4A",
  dangerSoft: "#FDE7EB",
  success: "#16874F",
  successSoft: "#E2F6EA",
  violet: "#5B5FC7",
  violetSoft: "#ECECFF",
  shadow: "rgba(22, 33, 36, 0.12)",
};

const darkColors = {
  background: "#111618",
  surface: "#182024",
  surfaceMuted: "#202B30",
  surfaceStrong: "#29373D",
  text: "#EFF6F7",
  textMuted: "#A9B8BD",
  border: "#344247",
  primary: "#41D6C3",
  primarySoft: "#123A36",
  accent: "#F7B84B",
  accentSoft: "#3C2C13",
  danger: "#FF6B81",
  dangerSoft: "#421923",
  success: "#5BE090",
  successSoft: "#123B24",
  violet: "#A7A7FF",
  violetSoft: "#25254E",
  shadow: "rgba(0, 0, 0, 0.35)",
};

const ThemeContext = createContext<AppTheme | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let isMounted = true;

    SecureStore.getItemAsync(themeStorageKey)
      .then((value) => {
        if (
          isMounted &&
          (value === "system" || value === "light" || value === "dark")
        ) {
          setModeState(value);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    void SecureStore.setItemAsync(themeStorageKey, nextMode).catch(() => {});
  };

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
  const colors = isDark ? darkColors : lightColors;
  const value = useMemo(
    () => ({
      colors,
      isDark,
      mode,
      setMode,
    }),
    [colors, isDark, mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = React.use(ThemeContext);

  if (!value) {
    throw new Error("useAppTheme must be used inside AppThemeProvider.");
  }

  return value;
}
