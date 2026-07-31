import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { getSetting, setSetting } from "../db";
import { darkColors, lightColors, type ThemeColors } from "../lib/theme";

export type ThemeMode = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

const THEME_MODE_SETTING_KEY = "themeMode";

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    getSetting(THEME_MODE_SETTING_KEY).then((stored) => {
      if (isThemeMode(stored)) {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    setSetting(THEME_MODE_SETTING_KEY, next);
  };

  const scheme: ColorScheme = mode === "system" ? (systemScheme ?? "light") : mode;
  const colors = scheme === "dark" ? darkColors : lightColors;

  const value = useMemo(() => ({ mode, scheme, colors, setMode }), [mode, scheme, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
