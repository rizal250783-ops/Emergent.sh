import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, fileUrl } from "@/src/api";
import { rupiah, formatDate, waLink } from "@/src/format";
import { Icon, Loading, ErrorState, Button, Badge, spacing, radius } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useShareAsset } from "@/src/components/share";
import { AssetMap } from "@/src/components/asset-map";

const { width } = Dimensions.get("window");

export default function PublicDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const toast = useToast();
  const [imgIndex, setImgIndex] = useState(0);
  const { share, sheet } = useShareAsset();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-asset", id],
    queryFn: () => apiGet(`/public/catalog/${id}`),
  });

  if (isLoading) return <View style={s.screen}><Loading text="Memuat detail asset..." /></View>;
  if (isError || !data) return <View style={[s.screen, { paddingTop: insets.top }]}><TopBack /><ErrorState onRetry={refetch} message="Detail asset tidak tersedia" /></View>;

  const images: string[] = data.images?.length ? data.images : [];
  const link = waLink(data.pic_wa, data.nomor_asset, data.judul_asset);

  const openWa = async () => {
    if (!link) { toast("Nomor PIC belum tersedia", "error"); return; }
    const ok = await Linking.canOpenURL(link);
    if (ok) Linking.openURL(link);
    else toast("Tidak dapat membuka WhatsApp", "error");
  };

  function TopBack() {
    return (
      <Pressable style={[s.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()} testID="detail-back">
        <Icon name="arrow-left" size={22} color="#FFFFFF" />
      </Pressable>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <View style={s.gallery}>
          {images.length > 0 ? (
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {images.map((u, i) => (
                <Image key={i} source={{ uri: fileUrl(u) }} style={{ width, height: 280 }} contentFit="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[s.noImg, { width, height: 280 }]}><Icon name="image" size={40} color={colors.muted} /></View>
          )}
          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => <View key={i} style={[s.dot, i === imgIndex && s.dotActive]} />)}
            </View>
          )}
          <Pressable style={[s.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()} testID="detail-back">
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable style={[s.backBtn, s.shareBtn, { top: insets.top + 8 }]} onPress={() => share(data)} testID="share-button">
            <Icon name="share-2" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={s.body}>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            <Badge label={data.subkategori || data.kategori || "Asset"} tone="brand" />
            {data.has_schedule && <Badge label="Ada Jadwal Lelang" tone="warning" />}
          </View>
          <Text style={s.title}>{data.judul_asset}</Text>
          <Text style={s.nomor}>No. {data.nomor_asset}</Text>
          <View style={s.locRow}>
            <Icon name="map-pin" size={15} color={colors.muted} />
            <Text style={s.loc}>{[data.wilayah_level_4, data.kecamatan, data.kabupaten_kota, data.provinsi].filter(Boolean).join(", ")}</Text>
          </View>

          <View style={s.priceCard}>
            <Text style={s.priceLabel}>Harga Limit</Text>
            <Text style={s.price}>{rupiah(data.harga_limit)}</Text>
          </View>

          {/* Specs */}
          <View style={s.specGrid}>
            {data.luas_tanah != null && <Spec icon="maximize" label="Luas Tanah" value={`${data.luas_tanah} m²`} />}
            {data.luas_bangunan != null && <Spec icon="home" label="Luas Bangunan" value={`${data.luas_bangunan} m²`} />}
            {data.kondisi_asset && <Spec icon="check-circle" label="Kondisi" value={data.kondisi_asset} />}
          </View>

          <Section title="Deskripsi">
            <Text style={s.desc}>{data.deskripsi}</Text>
          </Section>

          <Section title="Alamat">
            <Text style={s.desc}>{data.alamat}</Text>
          </Section>

          <Section title="Peta Lokasi">
            {data.latitude != null && data.longitude != null ? (
              <AssetMap latitude={data.latitude} longitude={data.longitude} height={220} testID="asset-map" />
            ) : (
              <View style={s.noMap} testID="asset-map-empty">
                <Icon name="map" size={22} color={colors.muted} />
                <Text style={s.noMapTxt}>Titik lokasi belum tersedia. Hubungi PIC untuk arahan lokasi.</Text>
              </View>
            )}
          </Section>

          {data.has_schedule && (
            <Section title="Informasi Lelang">
              <InfoRow icon="calendar" label="Tanggal Lelang" value={formatDate(data.tanggal_lelang)} />
              {data.kpknl && (
                <>
                  <InfoRow icon="briefcase" label="KPKNL" value={data.kpknl.nama} />
                  <InfoRow icon="map" label="Alamat KPKNL" value={data.kpknl.alamat} />
                </>
              )}
            </Section>
          )}

          <Section title="Narahubung (PIC)">
            <InfoRow icon="user" label="Marketing Asset" value={data.pic_nama || "-"} />
          </Section>
        </View>
      </ScrollView>

      {/* Sticky WA + share */}
      <View style={[s.stickyBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Button title="Chat WhatsApp PIC" icon="message-circle" variant="secondary" onPress={openWa} testID="whatsapp-button" />
        </View>
        <Pressable style={s.shareSquare} onPress={() => share(data)} testID="share-button-bottom">
          <Icon name="share-2" size={20} color={colors.brandPrimary} />
        </Pressable>
      </View>
      {sheet}
    </View>
  );
}

function Spec({ icon, label, value }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.spec}>
      <Icon name={icon} size={18} color={colors.brandPrimary} />
      <Text style={s.specVal}>{value}</Text>
      <Text style={s.specLabel}>{label}</Text>
    </View>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function InfoRow({ icon, label, value }: any) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.infoRow}>
      <Icon name={icon} size={16} color={colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  gallery: { backgroundColor: c.surfaceTertiary },
  noImg: { alignItems: "center", justifyContent: "center" },
  dots: { position: "absolute", bottom: 12, alignSelf: "center", flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#FFFFFF", width: 18 },
  backBtn: { position: "absolute", left: spacing.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  shareBtn: { left: undefined, right: spacing.lg },
  shareSquare: { width: 50, height: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.brandPrimary, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  noMap: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.md },
  noMapTxt: { flex: 1, fontSize: 13, color: c.muted, lineHeight: 18 },
  body: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "800", color: c.onSurface, marginTop: 4 },
  nomor: { fontSize: 13, color: c.muted, fontWeight: "600" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  loc: { flex: 1, color: c.onSurfaceSecondary, fontSize: 13 },
  priceCard: { backgroundColor: c.brandTertiary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.sm },
  priceLabel: { color: c.onBrandTertiary, fontSize: 12, fontWeight: "600" },
  price: { color: c.onBrandTertiary, fontSize: 26, fontWeight: "900", marginTop: 2 },
  specGrid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  spec: { flex: 1, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, alignItems: "center", gap: 4 },
  specVal: { fontSize: 14, fontWeight: "800", color: c.onSurface },
  specLabel: { fontSize: 11, color: c.muted },
  section: { marginTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  desc: { fontSize: 14, color: c.onSurfaceSecondary, lineHeight: 21 },
  infoRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", paddingVertical: 6 },
  infoLabel: { fontSize: 12, color: c.muted },
  infoValue: { fontSize: 14, color: c.onSurface, fontWeight: "600" },
  stickyBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
}));
