import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, fileUrl } from "@/src/api";
import { rupiah, rupiahShort } from "@/src/format";
import { ScreenHeader, Icon, ErrorState, Badge, spacing, radius } from "@/src/components/ui";
import { HtmlFrame } from "@/src/components/html-frame";
import { buildClusterMapHtml } from "@/src/components/map-html";
import { useFavorites } from "@/src/favorites";

type Pin = {
  id: string; judul_asset: string; latitude: number; longitude: number; harga_limit: number | null; kategori?: string; subkategori?: string;
  kabupaten_kota?: string; provinsi?: string; image?: string | null; is_sold: boolean; has_schedule: boolean; penurunan_persen: number;
};

const FILTER_KEYS = ["keyword", "category_id", "provinsi", "kabupaten_kota", "kecamatan", "wilayah_level_4", "price_drop"] as const;

export default function AssetMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const { has, toggle } = useFavorites();
  const [selected, setSelected] = useState<Pin | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    FILTER_KEYS.forEach((k) => { const v = params[k]; if (v && v !== "false") p.set(k, String(v)); });
    return p.toString();
  }, [params]);

  const { data, isLoading, isError, refetch } = useQuery<{ total: number; pins: Pin[] }>({
    queryKey: ["public-map", qs],
    queryFn: () => apiGet(`/public/catalog/map${qs ? "?" + qs : ""}`),
  });
  const pins = data?.pins || [];

  const html = useMemo(
    () => buildClusterMapHtml(pins.map((p) => ({ id: p.id, latitude: p.latitude, longitude: p.longitude, harga_label: rupiahShort(p.harga_limit), is_sold: p.is_sold, penurunan_persen: p.penurunan_persen })), colors.brandPrimary, colors.brandSecondary),
    [pins, colors.brandPrimary, colors.brandSecondary]
  );

  const onMessage = useCallback((m: any) => {
    if (m.type === "bsi-pin") setSelected(pins.find((p) => p.id === m.id) || null);
    else if (m.type === "bsi-pin-clear") setSelected(null);
  }, [pins]);

  const filterLabel = [params.wilayah_level_4, params.kecamatan, params.kabupaten_kota, params.provinsi].filter(Boolean).join(", ");

  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader title="Peta Sebaran Asset" subtitle={isLoading ? "Memuat..." : `${pins.length} asset berlokasi${filterLabel ? " • " + filterLabel : ""}`} onBack={() => router.back()} />
      </View>
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={colors.brandPrimary} /></View>
        ) : isError ? (
          <ErrorState onRetry={refetch} message="Gagal memuat peta" />
        ) : (
          <HtmlFrame html={html} onMessage={onMessage} frameKey={qs + pins.length} />
        )}
        {!isLoading && !isError && pins.length === 0 && (
          <View style={s.emptyPill} testID="map-empty"><Icon name="map-pin" size={14} color={colors.muted} /><Text style={s.emptyTxt}>Tidak ada asset dengan titik lokasi untuk filter ini</Text></View>
        )}
        <View style={s.legend} pointerEvents="none">
          <View style={[s.legendDot, { backgroundColor: colors.brandPrimary }]} /><Text style={s.legendTxt}>Tersedia</Text>
          <View style={[s.legendDot, { backgroundColor: colors.brandSecondary }]} /><Text style={s.legendTxt}>Harga turun</Text>
          <View style={[s.legendDot, { backgroundColor: colors.muted }]} /><Text style={s.legendTxt}>Terjual</Text>
        </View>
        {selected && (
          <View style={[s.card, { paddingBottom: insets.bottom + spacing.md }]} testID="map-selected-card">
            <Pressable style={s.cardRow} onPress={() => router.push(`/asset/${selected.id}`)} testID="map-card-open">
              <Image source={{ uri: fileUrl(selected.image || undefined) }} style={s.cardImg} contentFit="cover" />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                  <Badge label={selected.subkategori || selected.kategori || "Asset"} tone="brand" />
                  {selected.is_sold ? <Badge label="TERJUAL" tone="error" /> : selected.has_schedule ? <Badge label="Sudah Ada Jadwal Lelang" tone="warning" /> : null}
                </View>
                <Text style={s.cardTitle} numberOfLines={2}>{selected.judul_asset}</Text>
                <Text style={s.cardLoc} numberOfLines={1}>{selected.kabupaten_kota}, {selected.provinsi}</Text>
                <Text style={s.cardPrice}>{rupiah(selected.harga_limit)}{selected.penurunan_persen > 0 ? `  ▼ ${selected.penurunan_persen}%` : ""}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
            <View style={s.cardActions}>
              <Pressable style={s.iconBtn} onPress={() => toggle(selected.id, selected)} testID="map-card-fav">
                <Icon name="heart" size={16} color={has(selected.id) ? colors.error : colors.brandPrimary} />
              </Pressable>
              <Pressable style={s.iconBtn} onPress={() => setSelected(null)} testID="map-card-close">
                <Icon name="x" size={16} color={colors.muted} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  legend: { position: "absolute", top: spacing.sm, left: spacing.sm, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 10, height: 28, borderRadius: radius.pill },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 4 },
  legendTxt: { fontSize: 11, color: c.onSurfaceSecondary, fontWeight: "600" },
  emptyPill: { position: "absolute", top: spacing.xl + 20, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceSecondary, paddingHorizontal: 12, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border },
  emptyTxt: { fontSize: 12, color: c.muted },
  card: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, borderTopWidth: 1, borderColor: c.border },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardImg: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  cardTitle: { fontSize: 14, fontWeight: "800", color: c.onSurface },
  cardLoc: { fontSize: 12, color: c.muted },
  cardPrice: { fontSize: 15, fontWeight: "900", color: c.brandPrimary },
  cardActions: { position: "absolute", top: -22, right: spacing.lg, flexDirection: "row", gap: spacing.sm },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
}));
