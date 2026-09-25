import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, Pressable, ScrollView, Modal, TextInput, RefreshControl, useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet } from "@/src/api";
import { Icon, EmptyState, ErrorState, Skeleton, Button, Select, spacing, radius } from "@/src/components/ui";
import { useAuth } from "@/src/auth";
import { useShareAsset } from "@/src/components/share";
import { useFavorites, useFavoriteUpdates } from "@/src/favorites";
import { AssetCard } from "@/src/components/asset-card";
import { PublicFooter } from "@/src/components/public-footer";

const LIMIT = 20;

export default function PublicCatalog() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cardW = (useWindowDimensions().width - spacing.lg * 2 - spacing.md) / 2;
  const { colors } = useTheme();
  const s = useStyles();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc>(EMPTY_LOC);
  const [priceDrop, setPriceDrop] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const { share, sheet } = useShareAsset();
  const { ids: favIds, has: favHas, toggle: toggleFav } = useFavorites();
  const { updates: favUpdates } = useFavoriteUpdates();

  // Live search: apply keyword automatically while typing (debounced)
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(keyword.trim()), 400);
    return () => clearTimeout(t);
  }, [keyword]);

  const { data: filters } = useQuery({
    queryKey: ["public-filters"],
    queryFn: () => apiGet("/public/filters"),
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("keyword", search);
    if (categoryId) p.set("category_id", categoryId);
    (Object.keys(loc) as (keyof Loc)[]).forEach((k) => { if (loc[k]) p.set(k, loc[k]); });
    if (priceDrop) p.set("price_drop", "true");
    p.set("limit", String(LIMIT));
    return p.toString();
  }, [search, categoryId, loc, priceDrop]);

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
  const openMap = () => {
    const p: Record<string, string> = {};
    if (search) p.keyword = search;
    if (categoryId) p.category_id = categoryId;
    (Object.keys(loc) as (keyof Loc)[]).forEach((k) => { if (loc[k]) p[k] = loc[k]; });
    if (priceDrop) p.price_drop = "true";
    router.push({ pathname: "/map", params: p });
  };

  const activeFilters = (categoryId ? 1 : 0) + Object.values(loc).filter(Boolean).length + (priceDrop ? 1 : 0);
  const locLabel = [loc.wilayah_level_4, loc.kecamatan, loc.kabupaten_kota, loc.provinsi].filter(Boolean).join(", ");

  const categories = filters?.categories ?? [];

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.brandRow}>
          <View style={s.logoBox}>
            <Image source={require("../assets/images/bsi-logo.png")} style={s.logoImg} contentFit="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.appName}>BSI ASSET DEAL</Text>
            <Text style={s.tagline}>Menghubungkan Pembeli dengan Aset BSI</Text>
          </View>
          <Pressable testID="map-entry-button" style={s.iconBtn} onPress={openMap}>
            <Icon name="map" size={18} color={colors.onBrandPrimary} />
          </Pressable>
          <Pressable testID="favorites-entry-button" style={s.iconBtn} onPress={() => router.push("/favorites")}>
            <Icon name="heart" size={18} color={colors.onBrandPrimary} />
            {favUpdates.length > 0 ? (
              <View style={[s.filterDot, s.alertDot]} testID="favorites-alert-badge"><Text style={s.filterDotTxt}>{favUpdates.length}</Text></View>
            ) : favIds.length > 0 ? (
              <View style={s.filterDot}><Text style={s.filterDotTxt}>{favIds.length}</Text></View>
            ) : null}
          </Pressable>
          <Pressable
            testID="login-entry-button"
            style={s.loginBtn}
            onPress={() => router.push(user ? "/dashboard" : "/login")}
            accessibilityLabel={user ? "Panel internal" : "Masuk"}
          >
            <Icon name={user ? "grid" : "log-in"} size={16} color={colors.brandPrimary} />
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

        {/* Location search: Provinsi -> Kab/Kota -> Kecamatan (lower levels optional) */}
        <LocationBar loc={loc} onChange={setLoc} />

        {/* Category chips: wrap so every option is visible without horizontal scrolling */}
        <View style={s.chipsWrap}>
          <Pressable onPress={() => setPriceDrop((v) => !v)} style={[s.chip, s.dropChip, priceDrop && s.dropChipActive]} testID="chip-harga-turun">
            <Icon name="trending-down" size={14} color={priceDrop ? "#FFFFFF" : colors.brandSecondary} />
            <Text style={[s.chipTxt, priceDrop && { color: "#FFFFFF" }]}>Harga Turun</Text>
          </Pressable>
          <Chip label="Semua" active={!categoryId} onPress={() => setCategoryId(null)} />
          {categories.map((c: any) => (
            <Chip key={c.id} label={c.nama_category} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
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
            <Button title="Reset Filter" variant="outline" full={false} onPress={() => { setCategoryId(null); setLoc(EMPTY_LOC); setPriceDrop(false); setKeyword(""); setSearch(""); }} testID="reset-filter-empty" />
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
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={s.resultCount}>{total} asset {priceDrop ? "dengan harga turun" : "tersedia"}</Text>
                <Pressable style={s.mapPill} onPress={openMap} testID="view-on-map">
                  <Icon name="map" size={12} color={colors.brandPrimary} />
                  <Text style={s.mapPillTxt}>Lihat di Peta</Text>
                </Pressable>
              </View>
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
          renderItem={({ item }) => <AssetCard item={item} onPress={() => router.push(`/asset/${item.id}`)} onShare={() => share(item)} fav={favHas(item.id)} onFav={() => toggleFav(item.id, item)} width={cardW} />}
          ListFooterComponent={
            <View>
              {isFetchingNextPage && <View style={{ padding: 16 }}><Skeleton h={12} w="40%" style={{ alignSelf: "center" }} /></View>}
              {!hasNextPage && <PublicFooter />}
            </View>
          }
        />
      )}

      <FilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        categoryId={categoryId}
        loc={loc}
        onApply={(c: string | null, l: Loc, reset?: boolean) => { setCategoryId(c); setLoc(l); if (reset) setPriceDrop(false); setFilterOpen(false); }}
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

type Loc = { provinsi: string; kabupaten_kota: string; kecamatan: string; wilayah_level_4: string };
const EMPTY_LOC: Loc = { provinsi: "", kabupaten_kota: "", kecamatan: "", wilayah_level_4: "" };

/** Inline location search on the home header. Kab/Kota and Kecamatan are optional refinements. */
function LocationBar({ loc, onChange }: { loc: Loc; onChange: (l: Loc) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const provs = useLocOptions({}, true);
  const kabs = useLocOptions({ provinsi: loc.provinsi }, !!loc.provinsi);
  const kecs = useLocOptions({ provinsi: loc.provinsi, kabupaten_kota: loc.kabupaten_kota }, !!loc.kabupaten_kota);
  const opts = (d?: { options: string[] }) => (d?.options || []).map((v) => ({ value: v, label: v }));

  // eslint-disable-next-line react/display-name
  const chip = (lbl: string, value: string, placeholder: string, disabled: boolean, onClear: () => void, testID: string) =>
    (open: () => void) => (
      <Pressable style={[s.locChip, value ? s.locChipActive : null, disabled ? s.locChipDisabled : null]} onPress={open} disabled={disabled} testID={testID}>
        <View style={{ flex: 1 }}>
          <Text style={[s.locChipLbl, value ? { color: colors.muted } : null]}>{lbl}</Text>
          <Text style={[s.locChipTxt, value ? s.locChipTxtActive : null]} numberOfLines={1}>{value || placeholder}</Text>
        </View>
        {value ? (
          <Pressable onPress={onClear} hitSlop={8} testID={`${testID}-clear`}><Icon name="x" size={14} color={colors.muted} /></Pressable>
        ) : (
          <Icon name="chevron-down" size={14} color={value ? colors.brandPrimary : colors.onBrandPrimary} />
        )}
      </Pressable>
    );

  return (
    <View style={s.locBar}>
      <Select label="Provinsi" searchable value={loc.provinsi || null} options={opts(provs.data)} testID="loc-provinsi"
        onChange={(v) => onChange({ provinsi: v, kabupaten_kota: "", kecamatan: "", wilayah_level_4: "" })}
        trigger={chip("Provinsi", loc.provinsi, "Semua", false, () => onChange(EMPTY_LOC), "loc-provinsi")} />
      <Select label="Kabupaten / Kota" searchable value={loc.kabupaten_kota || null} options={opts(kabs.data)} testID="loc-kabkota"
        emptyText="Memuat..." onChange={(v) => onChange({ ...loc, kabupaten_kota: v, kecamatan: "", wilayah_level_4: "" })}
        trigger={chip("Kab/Kota", loc.kabupaten_kota, loc.provinsi ? "Semua" : "—", !loc.provinsi, () => onChange({ ...loc, kabupaten_kota: "", kecamatan: "", wilayah_level_4: "" }), "loc-kabkota")} />
      <Select label="Kecamatan" searchable value={loc.kecamatan || null} options={opts(kecs.data)} testID="loc-kecamatan"
        emptyText="Memuat..." onChange={(v) => onChange({ ...loc, kecamatan: v, wilayah_level_4: "" })}
        trigger={chip("Kecamatan", loc.kecamatan, loc.kabupaten_kota ? "Semua" : "—", !loc.kabupaten_kota, () => onChange({ ...loc, kecamatan: "", wilayah_level_4: "" }), "loc-kecamatan")} />
    </View>
  );
}

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
              <Button title="Reset" variant="outline" onPress={() => { setC(null); setL(EMPTY_LOC); onApply(null, EMPTY_LOC, true); }} testID="filter-reset" />
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
  header: { backgroundColor: c.brandPrimary, paddingBottom: spacing.md },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  logoBox: { backgroundColor: "#FFFFFF", borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, justifyContent: "center" },
  logoImg: { width: 60, height: 17 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  locBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  locChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.md, paddingHorizontal: 10, height: 38, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  locChipActive: { backgroundColor: "#FFFFFF" },
  locChipDisabled: { opacity: 0.45 },
  locChipTxt: { flex: 1, fontSize: 12, fontWeight: "700", color: c.onBrandPrimary },
  locChipTxtActive: { color: c.brandPrimary },
  locChipLbl: { fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: "700", textTransform: "uppercase" },
  appName: { color: "#FFFFFF", fontWeight: "800", fontSize: 14, letterSpacing: 0.2 },
  tagline: { color: "#E6F6F6", fontSize: 10 },
  loginBtn: { flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, backgroundColor: "#FFFFFF", width: 48, height: 40, borderRadius: radius.md },
  loginTxt: { color: c.brandPrimary, fontWeight: "800", fontSize: 9 },
  searchRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: radius.md, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: c.onSurface },
  filterBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  filterDot: { position: "absolute", top: -4, right: -4, backgroundColor: c.brandSecondary, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterDotTxt: { color: c.onBrandSecondary, fontSize: 10, fontWeight: "800" },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: "#FFFFFF" },
  alertDot: { backgroundColor: c.error },
  dropChip: { flexDirection: "row", gap: 6, borderWidth: 1, borderColor: c.brandSecondary },
  dropChipActive: { backgroundColor: c.success, borderColor: c.success },
  chipTxt: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  chipTxtActive: { color: c.brandPrimary },
  resultHead: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 6 },
  resultCount: { color: c.muted, fontSize: 13, fontWeight: "600" },
  mapPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.brandPrimary, paddingHorizontal: 10, height: 30, borderRadius: radius.pill },
  mapPillTxt: { color: c.brandPrimary, fontSize: 12, fontWeight: "700" },
  locPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: c.brandTertiary, paddingHorizontal: 10, height: 30, borderRadius: radius.pill, maxWidth: "100%" },
  locPillTxt: { color: c.brandPrimary, fontSize: 12, fontWeight: "700", flexShrink: 1 },
  filterHint: { fontSize: 12, color: c.muted, marginBottom: spacing.sm, marginTop: -4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, padding: spacing.lg },
  cardWrap: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
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
