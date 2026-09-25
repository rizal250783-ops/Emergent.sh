import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";
import { Icon, spacing, radius } from "@/src/components/ui";
import { buildMapHtml } from "@/src/components/map-html";
import type { AssetMapProps } from "@/src/components/asset-map";

export function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Web variant: Leaflet/OSM inside a sandboxed iframe (react-native-webview has no web target). */
export function AssetMap({ latitude, longitude, height = 220, editable = false, onChange, testID }: AssetMapProps) {
  const { colors } = useTheme();
  const lastEmitted = useRef<string>("");
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const key = `${latitude ?? ""},${longitude ?? ""}`;
    if (key !== lastEmitted.current) setSeed((x) => x + 1);
  }, [latitude, longitude]);

  const html = useMemo(
    () => buildMapHtml({ lat: latitude ?? null, lng: longitude ?? null, editable, brand: colors.brandPrimary }),
    [seed, editable, colors.brandPrimary]
  );

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      try {
        const m = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
        if (m && m.type === "bsi-map" && onChange) {
          lastEmitted.current = `${m.lat},${m.lng}`;
          onChange(m.lat, m.lng);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onChange]);

  return (
    <View style={[st.wrap, { height, borderColor: colors.border }]} testID={testID}>
      {React.createElement("iframe", {
        key: seed,
        srcDoc: html,
        style: { border: 0, width: "100%", height: "100%", display: "block" },
        sandbox: "allow-scripts allow-same-origin",
        title: "Peta lokasi asset",
      })}
      {!editable && latitude != null && longitude != null && (
        <Pressable style={[st.openBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]} onPress={() => Linking.openURL(mapsLink(latitude, longitude))} testID="open-maps-button">
          <Icon name="navigation" size={14} color={colors.brandPrimary} />
          <Text style={[st.openTxt, { color: colors.brandPrimary }]}>Buka di Google Maps</Text>
        </Pressable>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1 },
  openBtn: { position: "absolute", top: spacing.sm, right: spacing.sm, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 34, borderRadius: radius.pill, borderWidth: 1 },
  openTxt: { fontSize: 12, fontWeight: "700" },
});
