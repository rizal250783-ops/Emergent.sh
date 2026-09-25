import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme, FONTS } from "@/src/theme";
import { Icon, spacing, radius } from "@/src/components/ui";
import { buildMapHtml } from "@/src/components/map-html";

export type AssetMapProps = {
  latitude?: number | null;
  longitude?: number | null;
  height?: number;
  editable?: boolean;
  onChange?: (lat: number, lng: number) => void;
  testID?: string;
};

export function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Native map (Leaflet/OSM in WebView). Web variant lives in asset-map.web.tsx */
export function AssetMap({ latitude, longitude, height = 220, editable = false, onChange, testID }: AssetMapProps) {
  const { colors } = useTheme();
  const lastEmitted = useRef<string>("");
  const [seed, setSeed] = useState(0);

  // Reload the map only when coordinates change from outside (not from a drag we emitted).
  useEffect(() => {
    const key = `${latitude ?? ""},${longitude ?? ""}`;
    if (key !== lastEmitted.current) setSeed((x) => x + 1);
  }, [latitude, longitude]);

  const html = useMemo(
    () => buildMapHtml({ lat: latitude ?? null, lng: longitude ?? null, editable, brand: colors.brandPrimary }),
    [seed, editable, colors.brandPrimary]
  );

  return (
    <View style={[st.wrap, { height, borderColor: colors.border }]} testID={testID}>
      <WebView
        key={seed}
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1, backgroundColor: colors.surfaceTertiary }}
        scrollEnabled={false}
        javaScriptEnabled
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.type === "bsi-map" && onChange) {
              lastEmitted.current = `${m.lat},${m.lng}`;
              onChange(m.lat, m.lng);
            }
          } catch {}
        }}
      />
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
  openTxt: { fontSize: 12, fontFamily: FONTS.bold },
});
