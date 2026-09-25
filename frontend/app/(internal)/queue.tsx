import React, { useState } from "react";
import { View, Text, FlatList, Pressable, ScrollView, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, fileUrl } from "@/src/api";
import { useAuth } from "@/src/auth";
import { rupiahShort, statusMeta } from "@/src/format";
import { ScreenHeader, Badge, Loading, ErrorState, EmptyState, Skeleton, Icon, spacing, radius } from "@/src/components/ui";

const MA_FILTERS = [
  { key: "", label: "Semua" },
  { key: "DRAFT", label: "Draft" },
  { key: "WAITING_ACRM_REVIEW", label: "Menunggu ACRM" },
  { key: "RETURN_TO_MARKETING", label: "Dikembalikan" },
  { key: "WAITING_RCG_APPROVAL", label: "Menunggu RCG" },
  { key: "PUBLISHED", label: "Published" },
];

export default function Queue() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const [filter, setFilter] = useState("");

  const isMA = user?.role === "marketing_asset";
  const path = isMA
    ? `/assets/mine${filter ? `?status=${filter}` : ""}`
    : user?.role === "acrm" ? "/acrm/pending" : "/rcg/pending";
  const key = isMA ? ["queue-ma", filter] : [user?.role === "acrm" ? "acrm-pending" : "rcg-pending"];

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: key as any,
    queryFn: () => apiGet(path),
  });

  const title = isMA ? "Asset Saya" : user?.role === "acrm" ? "Antrian Review" : "Antrian Approval";
  const subtitle = isMA ? undefined : user?.role === "acrm" ? user?.acr?.nama : "Persetujuan final nasional";
  const items: any[] = data || [];

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={title} subtitle={subtitle} />
      {isMA && (
        <View style={{ height: 56, justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
            {MA_FILTERS.map((f) => (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, filter === f.key && s.chipActive]} testID={`filter-${f.key || "all"}`}>
                <Text style={[s.chipTxt, filter === f.key && s.chipTxtActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={92} style={{ borderRadius: radius.md }} />)}
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          testID="queue-empty"
          icon={isMA ? "folder" : "check-circle"}
          title={isMA ? "Belum ada asset" : "Tidak ada antrian"}
          subtitle={isMA ? "Tambah asset baru dari tab Tambah." : "Semua asset sudah diproses."}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push(`/detail/${item.id}`)} testID={`queue-item-${item.id}`}>
              <Image source={{ uri: fileUrl(item.images?.[0]) }} style={s.thumb} contentFit="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.judul_asset}</Text>
                <Text style={s.cardNum}>{item.nomor_asset}</Text>
                {!isMA && <Text style={s.cardPic}>PIC: {item.pic_nama}</Text>}
                <Text style={s.cardPrice}>{rupiahShort(item.harga_limit)}</Text>
                <Badge label={statusMeta(item.status).label} tone={statusMeta(item.status).tone} />
              </View>
              <Icon name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipTxt: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 13 },
  chipTxtActive: { color: c.onBrandPrimary },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: c.surfaceTertiary },
  cardTitle: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  cardNum: { fontSize: 11, color: c.muted },
  cardPic: { fontSize: 12, color: c.onSurfaceSecondary },
  cardPrice: { fontSize: 14, fontWeight: "800", color: c.onSurface },
}));
