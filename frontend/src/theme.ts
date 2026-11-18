// Design tokens — BSI Asset Deal premium theme (light).
// Palet korporat BSI: Teal #00A0A0 (dominan) + Emas #F0B43C (aksen premium).

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme, TextStyle } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F7FAFA",
  onSurface: "#0F2A2A",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#0F2A2A",
  surfaceTertiary: "#E0F5F5",
  onSurfaceTertiary: "#006666",
  surfaceInverse: "#002E2E",
  onSurfaceInverse: "#FFFFFF",
  muted: "#5B7373",

  brand: "#00A0A0",
  onBrand: "#FFFFFF",
  brandPrimary: "#00A0A0",
  onBrandPrimary: "#FFFFFF",
  brandPrimaryDark: "#004D4D",
  brandSecondary: "#F0B43C",
  onBrandSecondary: "#004D4D",
  brandSecondaryDark: "#C98F1F",
  brandSecondarySoft: "#FFF4DC",
  onBrandSecondarySoft: "#8A5A00",
  brandTertiary: "#E0F5F5",
  onBrandTertiary: "#006666",
  brandDeep: "#006666",
  brandDeepDark: "#004D4D",
  brandDarkSurface: "#002E2E",
  brandSoftMid: "#B2E4E4",

  success: "#1FA67A",
  onSuccess: "#FFFFFF",
  warning: "#F0B43C",
  onWarning: "#004D4D",
  error: "#D64545",
  onError: "#FFFFFF",
  info: "#5B7373",
  onInfo: "#FFFFFF",

  border: "#DDEAEA",
  borderStrong: "#B2E4E4",
  divider: "#E4F0F0",
  goldBorder: "#F0B43C",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "light" || system === "dark" ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Signature BSI gradients (for LinearGradient colors prop).
export const gradients = {
  teal: ["#004D4D", "#00A0A0"] as const,
  tealSoft: ["#006666", "#00A0A0"] as const,
  gold: ["#F0B43C", "#FFD98A", "#C98F1F"] as const,
  goldSoft: ["#F0B43C", "#FFD98A"] as const,
};

// ---------- Typography: Lato body / Lato-Black display ----------
export const FONTS = {
  regular: "Lato-Regular",
  bold: "Lato-Bold",
  black: "Lato-Black",
  italic: "Lato-Italic",
} as const;

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
