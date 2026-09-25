import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, Pressable, ScrollView, Modal, TextInput, RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, fileUrl } from "@/src/api";
import { rupiahShort, formatDate } from "@/src/format";
import { Icon, Badge, EmptyState, ErrorState, Skeleton, Button, Select, spacing, radius } from "@/src/components/ui";
import { useAuth } from "@/src/auth";
import { useShareAsset } from "@/src/components/share";

const LIMIT = 20;

export default function PublicCatalog() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc>(EMPTY_LOC);
  const [filterOpen, setFilterOpen] = useState(false);
  const { share, sheet } = useShareAsset();

  const { data: filters } = useQuery({
    queryKey: ["public-filters"],
    queryFn: () => apiGet("/public/filters"),
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("keyword", search);
    if (categoryId) p.set("category_id", categoryId);
    (Object.keys(loc) as (keyof Loc)[]).forEach((k) => { if (loc[k]) p.set(k, loc[k]); });
    p.set("limit", String(LIMIT));
    return p.toString();
  }, [search, categoryId, loc]);

  const {
    data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching,
  } = useInfiniteQuery({
    queryKey: ["catalog", query],
    queryFn: ({ pageParam = 1 }) => apiGet(`/public/catalog?${query}&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last: any, pages) => {
      const loaded = pages.reduce((n, p: any) => n + p.items.length, 0);
      return loaded < last.total ? pages.length + 1 : undefined;
    },
  });

  const items = data?.pages.flatMap((p: any) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const activeFilters = (categoryId ? 1 : 0) + Object.values(loc).filter(Boolean).length;
  const locLabel = [loc.wilayah_level_4, loc.kecamatan, loc.kabupaten_kota, loc.provinsi].filter(Boolean).join(", ");

  const categories = filters?.categories ?? [];

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.brandRow}>
          <View style={s.logoBox}>
            <Text style={s.logoBsi}>BSI</Text>
            <Icon name="star" size={12} color={colors.brandSecondary} style={{ marginLeft: 2, marginTop: -6 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.appName}>BSI ASSET DEAL</Text>
            <Text style={s.tagline}>Connecting Buyers with BSI Assets</Text>
          </View>
          <Pressable
            testID="login-entry-button"
            style={s.loginBtn}
            onPress={() => router.push(user ? "/dashboard" : "/login")}
          >
            <Icon name={user ? "grid" : "log-in"} size={16} color={colors.onBrandPrimary} />
            <Text style={s.loginTxt}>{user ? "Panel" : "Masuk"}</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Icon name="search" size={18} color={colors.muted} />
            <TextInput
              testID="catalog-search-input"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSearch(keyword.trim())}
              returnKeyType="search"
              placeholder="Cari asset, lokasi, nomor..."
              placeholderTextColor={colors.muted}
              style={s.searchInput}
            />
            {keyword.length > 0 && (
              <Pressable onPress={() => { setKeyword(""); setSearch(""); }} testID="clear-search">
                <Icon name="x" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <Pressable testID="open-filter" style={s.filterBtn} onPress={() => setFilterOpen(true)}>
            <Icon name="sliders" size={18} color={colors.onBrandPrimary} />
            {activeFilters > 0 && <View style={s.filterDot}><Text style={s.filterDotTxt}>{activeFilters}</Text></View>}
          </Pressable>
        </View>

        {/* Category chips */}
        <View style={{ height: 56, justifyContent: "center" }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
          >
            <Chip label="Semua" active={!categoryId} onPress={() => setCategoryId(null)} />
            {categories.map((c: any) => (
              <Chip key={c.id} label={c.nama_category} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={s.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={s.cardWrap}>
              <Skeleton h={130} style={{ borderRadius: radius.md }} />
              <Skeleton h={12} w="80%" style={{ marginTop: 8 }} />
              <Skeleton h={12} w="50%" style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} message="Gagal memuat katalog" />
      ) : items.length === 0 ? (
        <EmptyState
          testID="catalog-empty"
          icon="search"
          title="Tidak ada asset ditemukan"
          subtitle="Coba ubah kata kunci atau hapus filter."
          action={activeFilters > 0 || search ? (
            <Button title="Reset Filter" variant="outline" full={false} onPress={() => { setCategoryId(null); setLoc(EMPTY_LOC); setKeyword(""); setSearch(""); }} testID="reset-filter-empty" />
          ) : undefined}
        />
      ) : (
        <FlatList
          data={items}
          key="grid"
          numColumns={2}
          keyExtractor={(it) => it.id}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
          ListHeaderComponent={
            <View style={s.resultHead}>
              <Text style={s.resultCount}>{total} asset tersedia</Text>
              {locLabel ? (
                <Pressable style={s.locPill} onPress={() => setLoc(EMPTY_LOC)} testID="clear-location-filter">
                  <Icon name="map-pin" size={12} color={colors.brandPrimary} />
                  <Text style={s.locPillTxt} numberOfLines={1}>{locLabel}</Text>
                  <Icon name="x" size={12} color={colors.brandPrimary} />
                </Pressable>
              ) : null}
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => <AssetCard item={item} onPress={() => router.push(`/asset/${item.id}`)} onShare={() => share(item)} />}
          ListFooterComponent={isFetchingNextPage ? <View style={{ padding: 16 }}><Skeleton h={12} w="40%" style={{ alignSelf: "center" }} /></View> : null}
        />
      )}

      <FilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        categoryId={categoryId}
        loc={loc}
        onApply={(c: string | null, l: Loc) => { setCategoryId(c); setLoc(l); setFilterOpen(false); }}
      />
      {sheet}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]} testID={`chip-${label}`}>
      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
    </Pressable>
  );
}

function AssetCard({ item, onPress, onShare }: { item: any; onPress: () => void; onShare: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={s.cardWrap} onPress={onPress} testID={`asset-card-${item.id}`}>
      <View style={s.cardImgWrap}>
        <Image source={{ uri: fileUrl(item.images?.[0]) }} style={s.cardImg} contentFit="cover" transition={200} />
        {item.has_schedule && (
          <View style={s.schedBadge}>
            <Icon name="calendar" size={11} color={colors.onBrandSecondary} />
            <Text style={s.schedTxt}>Ada Lelang</Text>
          </View>
        )}
        <Pressable style={s.cardShare} onPress={onShare} hitSlop={6} testID={`share-card-${item.id}`}>
          <Icon name="share-2" size={14} color={colors.brandPrimary} />
        </Pressable>
      </View>
      <View style={{ padding: spacing.sm, gap: 4 }}>
        <Text style={s.cardCat}>{item.subkategori || item.kategori}</Text>
        <Text style={s.cardTitle} numberOfLines={2}>{item.judul_asset}</Text>
        <View style={s.cardLocRow}>
          <Icon name="map-pin" size={11} color={colors.muted} />
          <Text style={s.cardLoc} numberOfLines={1}>{item.kabupaten_kota}, {item.provinsi}</Text>
        </View>
        <Text style={s.cardPrice}>{rupiahShort(item.harga_limit)}</Text>
        {item.has_schedule && <Text style={s.cardSched}>Lelang: {formatDate(item.tanggal_lelang)}</Text>}
      </View>
    </Pressable>
  );
}

type Loc = { provinsi: string; kabupaten_kota: string; kecamatan: string; wilayah_level_4: string };
const EMPTY_LOC: Loc = { provinsi: "", kabupaten_kota: "", kecamatan: "", wilayah_level_4: "" };

function useLocOptions(params: Partial<Loc>, enabled: boolean) {
  const qs = new URLSearchParams();
  (Object.keys(params) as (keyof Loc)[]).forEach((k) => { if (params[k]) qs.set(k, params[k] as string); });
  const q = qs.toString();
  return useQuery<{ level: string; options: string[] }>({
    queryKey: ["public-locations", q],
    queryFn: () => apiGet(`/public/locations${q ? "?" + q : ""}`),
    enabled,
    staleTime: 60_000,
  });
}

function FilterModal({ visible, onClose, categories, categoryId, loc, onApply }: any) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [c, setC] = useState<string | null>(categoryId);
  const [l, setL] = useState<Loc>(loc);
  React.useEffect(() => { setC(categoryId); setL(loc); }, [visible]);

  const provs = useLocOptions({}, visible);
  const kabs = useLocOptions({ provinsi: l.provinsi }, visible && !!l.provinsi);
  const kecs = useLocOptions({ provinsi: l.provinsi, kabupaten_kota: l.kabupaten_kota }, visible && !!l.kabupaten_kota);
  const kels = useLocOptions({ provinsi: l.provinsi, kabupaten_kota: l.kabupaten_kota, kecamatan: l.kecamatan }, visible && !!l.kecamatan);
  const opts = (d?: { options: string[] }) => (d?.options || []).map((v) => ({ value: v, label: v }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={[s.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={s.modalHandle} />
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>Filter Asset</Text>
            <Pressable onPress={onClose} testID="close-filter"><Icon name="x" size={22} color="#1F2937" /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.filterLabel}>Jenis Asset</Text>
            <View style={s.filterChips}>
              <FChip label="Semua" active={!c} onPress={() => setC(null)} />
              {categories.map((cat: any) => (
                <FChip key={cat.id} label={cat.nama_category} active={c === cat.id} onPress={() => setC(cat.id)} />
              ))}
            </View>
            <Text style={s.filterLabel}>Lokasi</Text>
            <Text style={s.filterHint}>Saring bertingkat sampai tingkat kelurahan/desa. Hanya wilayah yang memiliki asset yang ditampilkan.</Text>
            <View style={{ gap: spacing.sm }}>
              <Select label="Provinsi" searchable testID="filter-provinsi" value={l.provinsi || null} placeholder="Semua provinsi"
                options={opts(provs.data)} loading={provs.isLoading}
                onChange={(v) => setL({ provinsi: v, kabupaten_kota: "", kecamatan: "", wilayah_level_4: "" })} />
              <Select label="Kabupaten / Kota" searchable testID="filter-kabkota" value={l.kabupaten_kota || null}
                placeholder={l.provinsi ? "Semua kabupaten/kota" : "Pilih provinsi dulu"} disabled={!l.provinsi}
                options={opts(kabs.data)} loading={kabs.isLoading}
                onChange={(v) => setL({ ...l, kabupaten_kota: v, kecamatan: "", wilayah_level_4: "" })} />
              <Select label="Kecamatan" searchable testID="filter-kecamatan" value={l.kecamatan || null}
                placeholder={l.kabupaten_kota ? "Semua kecamatan" : "Pilih kabupaten/kota dulu"} disabled={!l.kabupaten_kota}
                options={opts(kecs.data)} loading={kecs.isLoading}
                onChange={(v) => setL({ ...l, kecamatan: v, wilayah_level_4: "" })} />
              <Select label="Kelurahan / Desa" searchable testID="filter-kelurahan" value={l.wilayah_level_4 || null}
                placeholder={l.kecamatan ? "Semua kelurahan/desa" : "Pilih kecamatan dulu"} disabled={!l.kecamatan}
                options={opts(kels.data)} loading={kels.isLoading}
                onChange={(v) => setL({ ...l, wilayah_level_4: v })} />
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button title="Reset" variant="outline" onPress={() => { setC(null); setL(EMPTY_LOC); }} testID="filter-reset" />
            </View>
            <View style={{ flex: 1.4 }}>
              <Button title="Terapkan" onPress={() => onApply(c, l)} testID="filter-apply" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable onPress={onPress} style={[s.fchip, active && s.fchipActive]}>
      <Text style={[s.fchipTxt, active && s.fchipTxtActive]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { backgroundColor: c.brandPrimary, paddingBottom: spacing.sm },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  logoBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFFFFF", borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  logoBsi: { color: "#00A0A0", fontWeight: "900", fontSize: 18, letterSpacing: -0.5 },
  appName: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  tagline: { color: "#E6F6F6", fontSize: 11 },
  loginBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  loginTxt: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  searchRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: radius.md, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: c.onSurface },
  filterBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  filterDot: { position: "absolute", top: -4, right: -4, backgroundColor: c.brandSecondary, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterDotTxt: { color: c.onBrandSecondary, fontSize: 10, fontWeight: "800" },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: "#FFFFFF" },
  chipTxt: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  chipTxtActive: { color: c.brandPrimary },
  resultHead: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 6 },
  resultCount: { color: c.muted, fontSize: 13, fontWeight: "600" },
  locPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: c.brandTertiary, paddingHorizontal: 10, height: 30, borderRadius: radius.pill, maxWidth: "100%" },
  locPillTxt: { color: c.brandPrimary, fontSize: 12, fontWeight: "700", flexShrink: 1 },
  filterHint: { fontSize: 12, color: c.muted, marginBottom: spacing.sm, marginTop: -4 },
  cardShare: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, padding: spacing.lg },
  cardWrap: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  cardImgWrap: { width: "100%", aspectRatio: 1.2, backgroundColor: c.surfaceTertiary },
  cardImg: { width: "100%", height: "100%" },
  schedBadge: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: c.brandSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  schedTxt: { color: c.onBrandSecondary, fontSize: 10, fontWeight: "800" },
  cardCat: { color: c.brandPrimary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  cardTitle: { color: c.onSurface, fontSize: 14, fontWeight: "700", lineHeight: 18 },
  cardLocRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  cardLoc: { color: c.muted, fontSize: 11, flex: 1 },
  cardPrice: { color: c.onSurface, fontSize: 15, fontWeight: "800", marginTop: 2 },
  cardSched: { color: c.warning, fontSize: 10, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: spacing.md },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  filterLabel: { fontSize: 14, fontWeight: "700", color: c.onSurface, marginTop: spacing.md, marginBottom: spacing.sm },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  fchip: { paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
  fchipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  fchipTxt: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 13 },
  fchipTxtActive: { color: c.onBrandPrimary },
}));
