// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme, TextStyle } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F7F8FA",
  onSurface: "#1F2937",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1F2937",
  surfaceTertiary: "#E5E7EB",
  onSurfaceTertiary: "#1F2937",
  surfaceInverse: "#1F2937",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6B7280",

  brand: "#00A39D",
  onBrand: "#FFFFFF",
  brandPrimary: "#00A39D",
  onBrandPrimary: "#FFFFFF",
  brandPrimaryDark: "#007C77",
  brandSecondary: "#F8AD3C",
  onBrandSecondary: "#3A2A00",
  brandSecondaryDark: "#E0961F",
  brandSecondarySoft: "#FEF3DC",
  onBrandSecondarySoft: "#8A5A00",
  brandTertiary: "#E4F5F3",
  onBrandTertiary: "#007C77",

  success: "#059669",
  onSuccess: "#FFFFFF",
  warning: "#D97706",
  onWarning: "#FFFFFF",
  error: "#DC2626",
  onError: "#FFFFFF",
  info: "#475569",
  onInfo: "#FFFFFF",

  border: "#E5E7EB",
  borderStrong: "#9CA3AF",
  divider: "#E5E7EB",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  // RN 0.86 re-reads the device scheme only for the literal "unspecified";
  // null would pin useColorScheme() to null and the app to light.
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
// ---------- Typography: Lato everywhere ----------
// Fonts are loaded in app/_layout.tsx via expo-font. Because custom fonts on
// native need an explicit face per weight, makeStyles maps fontWeight to the
// matching Lato face and drops fontWeight. Use `font(weight)` for inline styles.
export const FONTS = {
  regular: "Lato-Regular",
  bold: "Lato-Bold",
  black: "Lato-Black",
  italic: "Lato-Italic",
  script: "Pacifico-Regular",
} as const;

/** Decorative script face for the brand tagline (loaded in app/_layout.tsx). */
export const SCRIPT_FONT = FONTS.script;

export function fontFamilyFor(weight?: string | number, fontStyle?: string): string {
  const w = String(weight ?? "400");
  if (fontStyle === "italic") return FONTS.italic;
  if (w === "900") return FONTS.black;
  if (w === "bold" || Number(w) >= 600) return FONTS.bold;
  return FONTS.regular;
}

/** Inline text style helper: <Text style={[font("700"), { color }]} /> */
export function font(weight: string | number = "400", extra: TextStyle = {}): TextStyle {
  return { fontFamily: fontFamilyFor(weight), ...extra };
}

function withLato<T extends Record<string, any>>(sheet: T): T {
  const out: Record<string, any> = {};
  for (const key of Object.keys(sheet)) {
    const st = sheet[key];
    if (st && typeof st === "object" && !st.fontFamily && ("fontSize" in st || "fontWeight" in st || "lineHeight" in st || "letterSpacing" in st)) {
      const { fontWeight, ...rest } = st;
      out[key] = { ...rest, fontFamily: fontFamilyFor(fontWeight, st.fontStyle) };
    } else out[key] = st;
  }
  return out as T;
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(withLato(factory(colors))), [colors]);
  };
}


