import React from "react";
import { View, FlatList, RefreshControl, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet } from "@/src/api";
import { ScreenHeader, EmptyState, ErrorState, Loading, Button, spacing } from "@/src/components/ui";
import { useFavorites } from "@/src/favorites";
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
  const { share, sheet } = useShareAsset();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["favorites", ids.join(",")],
    queryFn: () => apiGet(`/public/catalog/batch?ids=${encodeURIComponent(ids.join(","))}`),
    enabled: ready && ids.length > 0,
  });

  const items = ids.length ? data || [] : [];

  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader title="Asset Favorit" subtitle={`${ids.length} tersimpan di perangkat ini`} onBack={() => router.back()} />
      </View>
      {!ready || (isLoading && ids.length > 0) ? <Loading /> : isError ? <ErrorState onRetry={refetch} /> : items.length === 0 ? (
        <EmptyState icon="heart" title="Belum ada favorit" subtitle="Ketuk ikon hati pada asset untuk menyimpannya di sini."
          action={<Button title="Jelajahi Katalog" full={false} onPress={() => router.replace("/")} testID="browse-catalog" />} />
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(it) => it.id}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => (
            <AssetCard item={item} onPress={() => router.push(`/asset/${item.id}`)} onShare={() => share(item)} fav={has(item.id)} onFav={() => toggle(item.id)} width={cardW} />
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
}));
