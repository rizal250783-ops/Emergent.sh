import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Linking, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, apiPost, fileUrl } from "@/src/api";
import { rupiah, formatDate, waLink } from "@/src/format";
import { Icon, Loading, ErrorState, Button, Badge, spacing, radius } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useShareAsset } from "@/src/components/share";
import { useConfirm } from "@/src/components/confirm";
import { addAuctionToCalendar } from "@/src/calendar";
import { PhotoGallery } from "@/src/components/photo-gallery";
import { useFavorites } from "@/src/favorites";
import { AssetCard } from "@/src/components/asset-card";
import { PublicFooter } from "@/src/components/public-footer";
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
  const { has: favHas, toggle: toggleFav } = useFavorites();
  const isFav = typeof id === "string" && favHas(id);
  const confirm = useConfirm();
  const [calBusy, setCalBusy] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  // Interest signal: count one view per detail open
  useEffect(() => {
    if (typeof id === "string") apiPost(`/public/catalog/${id}/track`, { type: "view" }).catch(() => {});
  }, [id]);
  const { data: similar } = useQuery<any[]>({
    queryKey: ["similar", id],
    queryFn: () => apiGet(`/public/catalog/${id}/similar`),
    enabled: !!id,
  });

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
    apiPost(`/public/catalog/${data.id}/track`, { type: "wa" }).catch(() => {});
    const ok = await Linking.canOpenURL(link);
    if (ok) Linking.openURL(link);
    else toast("Tidak dapat membuka WhatsApp", "error");
  };

  const saveToCalendar = async () => {
    setCalBusy(true);
    try {
      const r = await addAuctionToCalendar(data, confirm);
      if (r.message) toast(r.message, r.ok ? "success" : "error");
    } catch {
      toast("Gagal menyimpan ke kalender", "error");
    } finally {
      setCalBusy(false);
    }
  };

  function TopBack() {
    return (
      <Pressable style={[s.backBtn, s.backPos, { top: insets.top + 8 }]} onPress={() => router.back()} testID="detail-back">
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
                <Pressable key={i} onPress={() => setGalleryOpen(true)} testID={`gallery-open-${i}`}>
                  <Image source={{ uri: fileUrl(u) }} style={{ width, height: 280 }} contentFit="cover" />
                </Pressable>
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
          {images.length > 0 && (
            <Pressable style={s.expandBtn} onPress={() => setGalleryOpen(true)} testID="gallery-expand">
              <Icon name="maximize-2" size={14} color="#FFFFFF" />
              <Text style={s.expandTxt}>{imgIndex + 1}/{images.length} • Layar penuh</Text>
            </Pressable>
          )}
          <Pressable style={[s.backBtn, s.backPos, { top: insets.top + 8 }]} onPress={() => router.back()} testID="detail-back">
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable style={[s.backBtn, s.shareBtn, { top: insets.top + 8 }]} onPress={() => share(data)} testID="share-button">
            <Icon name="share-2" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable style={[s.backBtn, s.favBtn, { top: insets.top + 8 }]} onPress={() => toggleFav(data.id, data)} testID="fav-button">
            <Icon name="heart" size={20} color={isFav ? colors.error : "#FFFFFF"} />
          </Pressable>
        </View>

        <View style={s.body}>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            <Badge label={data.subkategori || data.kategori || "Asset"} tone="brand" />
            {data.is_sold ? <Badge label="TERJUAL" tone="error" /> : data.has_schedule ? <Badge label="Sudah Ada Jadwal Lelang" tone="warning" /> : <Badge label="Belum Ada Jadwal Lelang" tone="neutral" />}
          </View>
          {data.is_sold && (
            <View style={s.soldBanner} testID="sold-banner">
              <Icon name="tag" size={18} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={s.soldTitle}>Asset ini telah terjual</Text>
                <Text style={s.soldSub}>Kontak PIC tidak lagi tersedia. Lihat asset serupa di bawah.</Text>
              </View>
            </View>
          )}
          <Text style={s.title}>{data.judul_asset}</Text>
          <Text style={s.nomor}>No. {data.nomor_asset}</Text>
          <View style={s.locRow}>
            <Icon name="map-pin" size={15} color={colors.muted} />
            <Text style={s.loc}>{[data.wilayah_level_4, data.kecamatan, data.kabupaten_kota, data.provinsi].filter(Boolean).join(", ")}</Text>
          </View>

          <View style={s.priceCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={s.priceLabel}>Harga Limit</Text>
              {data.penurunan_persen > 0 && !data.is_sold && (
                <View style={s.dropBadge} testID="price-drop-badge">
                  <Icon name="trending-down" size={12} color="#FFFFFF" />
                  <Text style={s.dropTxt}>Turun {data.penurunan_persen}%</Text>
                </View>
              )}
            </View>
            <Text style={s.price}>{rupiah(data.harga_limit)}</Text>
            {data.penurunan_persen > 0 && !data.is_sold && (
              <Text style={s.oldPrice}>Sebelumnya {rupiah(data.harga_sebelumnya)}{data.harga_turun_at ? ` • turun ${formatDate(data.harga_turun_at)}` : ""}</Text>
            )}
          </View>

          {(data.price_history || []).length > 1 && (
            <Section title="Riwayat Harga">
              <View testID="price-history">
                {[...data.price_history].reverse().map((h: any, i: number, arr: any[]) => {
                  const next = arr[i + 1];
                  const diff = next ? h.harga - next.harga : 0;
                  return (
                    <View key={`${h.at}-${i}`} style={s.histRow}>
                      <View style={[s.histDot, i === 0 && { backgroundColor: colors.brandPrimary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.histPrice, i === 0 && { color: colors.brandPrimary }]}>{rupiah(h.harga)}</Text>
                        <Text style={s.histDate}>{h.at ? formatDate(h.at) : "-"}{i === 0 ? " • harga saat ini" : ""}</Text>
                      </View>
                      {diff !== 0 && (
                        <Text style={[s.histDiff, { color: diff < 0 ? colors.success : colors.error }]}>{diff < 0 ? "▼" : "▲"} {rupiah(Math.abs(diff))}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </Section>
          )}

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
              {!data.is_sold && (
                <View style={{ marginTop: spacing.sm }}>
                  <Button title="Simpan ke Kalender HP" icon="calendar" variant="outline" onPress={saveToCalendar} loading={calBusy} testID="save-calendar-button" />
                </View>
              )}
            </Section>
          )}

          {!data.is_sold && (
            <Section title="Narahubung (PIC)">
              <InfoRow icon="user" label="Marketing Asset" value={data.pic_nama || "-"} />
            </Section>
          )}
        </View>

        {/* Similar assets */}
        {similar && similar.length > 0 && (
          <View style={s.similarWrap} testID="similar-section">
            <Text style={[s.similarTitle, { paddingHorizontal: spacing.lg }]}>Asset Serupa</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
              {similar.map((it) => (
                <AssetCard key={it.id} item={it} width={170} onPress={() => router.push(`/asset/${it.id}`)} fav={favHas(it.id)} onFav={() => toggleFav(it.id, it)} />
              ))}
            </ScrollView>
          </View>
        )}
        <PublicFooter />
      </ScrollView>

      {/* Sticky WA + share */}
      <View style={[s.stickyBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={{ flex: 1 }}>
          {data.is_sold ? (
            <View style={s.soldCta} testID="sold-cta"><Icon name="check-circle" size={18} color={colors.muted} /><Text style={s.soldCtaTxt}>Asset telah terjual</Text></View>
          ) : (
            <Button title="Chat WhatsApp PIC" icon="message-circle" variant="secondary" onPress={openWa} testID="whatsapp-button" />
          )}
        </View>
        <Pressable style={s.shareSquare} onPress={() => share(data)} testID="share-button-bottom">
          <Icon name="share-2" size={20} color={colors.brandPrimary} />
        </Pressable>
      </View>
      {sheet}
      <PhotoGallery images={images.map((u) => fileUrl(u) as string)} index={imgIndex} visible={galleryOpen} onClose={() => setGalleryOpen(false)} />
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
  backBtn: { position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  shareBtn: { right: spacing.lg },
  backPos: { left: spacing.lg },
  expandBtn: { position: "absolute", right: spacing.lg, bottom: spacing.md, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, height: 30, borderRadius: radius.pill },
  expandTxt: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  favBtn: { right: spacing.lg + 48 },
  soldBanner: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#FEE2E2", borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  soldTitle: { fontSize: 14, fontWeight: "800", color: c.error },
  soldSub: { fontSize: 12, color: c.onSurfaceSecondary, marginTop: 2 },
  soldCta: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  soldCtaTxt: { fontSize: 15, fontWeight: "700", color: c.muted },
  similarWrap: { marginTop: spacing.lg },
  similarTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface, marginBottom: spacing.sm },
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
  oldPrice: { color: c.onBrandTertiary, fontSize: 12, marginTop: 2, opacity: 0.85 },
  dropBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.success, paddingHorizontal: 8, height: 24, borderRadius: radius.pill },
  dropTxt: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  histRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.divider },
  histDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.border },
  histPrice: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  histDate: { fontSize: 11, color: c.muted, marginTop: 1 },
  histDiff: { fontSize: 12, fontWeight: "700" },
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
