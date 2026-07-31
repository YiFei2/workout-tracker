export interface ThemeColors {
  /** Screen background. */
  background: string;
  /** Elevated surface — modal cards, "white" set rows. */
  surface: string;
  /** Slightly-recessed surface — exercise cards, list rows. */
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  danger: string;
  dangerBg: string;
  success: string;
  /** Inactive chip/button background (e.g. the unpressed "Done" toggle). */
  neutralBg: string;
  /** Modal backdrop. */
  overlay: string;
}

export const lightColors: ThemeColors = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f2f2f2",
  text: "#111111",
  textMuted: "#666666",
  border: "#cccccc",
  primary: "#2563eb",
  primaryText: "#ffffff",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
  success: "#16a34a",
  neutralBg: "#e5e7eb",
  overlay: "rgba(0,0,0,0.4)",
};

export const darkColors: ThemeColors = {
  background: "#000000",
  surface: "#1c1c1e",
  surfaceMuted: "#242426",
  text: "#f2f2f2",
  textMuted: "#9a9a9e",
  border: "#3a3a3c",
  primary: "#3b82f6",
  primaryText: "#ffffff",
  danger: "#f87171",
  dangerBg: "#3f1a1a",
  success: "#22c55e",
  neutralBg: "#3a3a3c",
  overlay: "rgba(0,0,0,0.6)",
};
