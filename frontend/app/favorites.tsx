import React from "react";
import { View, Text, FlatList, RefreshControl, Pressable, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/src/theme";
import { ScreenHeader, EmptyState, ErrorState, Loading, Button, Icon, spacing, radius } from "@/src/components/ui";
import { useFavorites, useFavoriteUpdates } from "@/src/favorites";
import { useShareAsset } from "@/src/components/share";
import { AssetCard } from "@/src/components/asset-card";
import { PublicFooter } from "@/src/components/public-footer";

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cardW = (useWindowDimensions().width - spacing.lg * 2 - spacing.md) / 2;
  const s = useStyles();
  const { colors } = useTheme();
  const { ids, has, toggle, ready } = useFavorites();
  const { items, updates, markSeen, isLoading, isError, refetch, isRefetching } = useFavoriteUpdates();
  const { share, sheet } = useShareAsset();
  const changed = new Set(updates.map((u) => u.id));

  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader title="Asset Favorit" subtitle={`${ids.length} tersimpan di perangkat ini`} onBack={() => router.back()} />
      </View>
      {!ready || (isLoading && ids.length > 0) ? <Loading /> : isError ? <ErrorState onRetry={refetch} /> : items.length === 0 ? (
        <EmptyState icon="heart" title="Belum ada favorit" subtitle="Ketuk ikon hati pada asset untuk menyimpannya di sini. Anda akan diberi tahu jika harganya turun atau jadwal lelang keluar."
          action={<Button title="Jelajahi Katalog" full={false} onPress={() => router.replace("/")} testID="browse-catalog" />} />
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(it) => it.id}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={updates.length > 0 ? (
            <View style={s.updBox} testID="favorites-updates">
              <View style={s.updHead}>
                <View style={s.updIcon}><Icon name="bell" size={16} color="#FFFFFF" /></View>
                <Text style={s.updTitle}>{updates.length} pembaruan pada favorit Anda</Text>
                <Pressable onPress={() => markSeen()} hitSlop={8} testID="favorites-mark-all"><Text style={s.updAction}>Tandai dibaca</Text></Pressable>
              </View>
              {updates.map((u) => (
                <Pressable key={u.id} style={s.updRow} onPress={() => router.push(`/asset/${u.id}`)} testID={`favorites-update-${u.id}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.updAsset} numberOfLines={1}>{u.judul_asset}</Text>
                    {u.changes.map((c, i) => (
                      <View key={i} style={s.changeRow}>
                        <Icon name={c.type === "price" ? "trending-down" : c.type === "schedule" ? "calendar" : "tag"} size={12}
                          color={c.type === "price" ? colors.success : c.type === "schedule" ? colors.warning : colors.error} />
                        <Text style={s.changeTxt}>{c.text}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable onPress={() => markSeen(u.id)} hitSlop={8} testID={`favorites-seen-${u.id}`}><Icon name="check" size={16} color={colors.muted} /></Pressable>
                </Pressable>
              ))}
            </View>
          ) : null}
          renderItem={({ item }) => (
            <View style={{ width: cardW }}>
              <AssetCard item={item} width={cardW} onPress={() => router.push(`/asset/${item.id}`)} onShare={() => share(item)} fav={has(item.id)} onFav={() => toggle(item.id, item)} />
              {changed.has(item.id) && <View style={s.newDot} testID={`favorite-changed-${item.id}`}><Text style={s.newDotTxt}>BARU</Text></View>}
            </View>
          )}
          ListFooterComponent={<PublicFooter />}
        />
      )}
      {sheet}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  updBox: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.brandSecondary, padding: spacing.md, gap: spacing.sm },
  updHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  updIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.brandSecondary, alignItems: "center", justifyContent: "center" },
  updTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: c.onSurface },
  updAction: { fontSize: 12, fontWeight: "700", color: c.brandPrimary },
  updRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.divider },
  updAsset: { fontSize: 13, fontWeight: "700", color: c.onSurface },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  changeTxt: { fontSize: 12, color: c.onSurfaceSecondary, flex: 1 },
  newDot: { position: "absolute", top: -6, left: -4, backgroundColor: c.brandSecondary, paddingHorizontal: 6, height: 18, borderRadius: 9, justifyContent: "center" },
  newDotTxt: { fontSize: 9, fontWeight: "900", color: c.onBrandSecondary },
}));
