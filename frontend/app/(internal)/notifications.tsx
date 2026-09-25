import React from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { formatDateTime } from "@/src/format";
import { ScreenHeader, EmptyState, Loading, ErrorState, Icon, spacing, radius } from "@/src/components/ui";

const ICONS: Record<string, string> = { review: "inbox", approval: "check-square", asset: "layers", mutasi: "shuffle" };

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet("/notifications"),
  });

  const items = data?.items || [];

  const markRead = async (id: string) => {
    await apiPost(`/notifications/${id}/read`);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const readAll = async () => {
    await apiPost("/notifications/read-all");
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Notifikasi" subtitle={data?.unread ? `${data.unread} belum dibaca` : "Semua sudah dibaca"}
        right={data?.unread ? <Pressable onPress={readAll} testID="read-all"><Text style={s.readAll}>Baca semua</Text></Pressable> : undefined} />
      {isLoading ? <Loading /> : isError ? <ErrorState onRetry={refetch} /> : items.length === 0 ? (
        <EmptyState icon="bell" title="Belum ada notifikasi" subtitle="Aktivitas terkait asset Anda akan muncul di sini." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing["2xl"] }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Pressable style={[s.item, !item.is_read && s.itemUnread]} onPress={() => markRead(item.id)} testID={`notif-${item.id}`}>
              <View style={[s.iconBox, !item.is_read && { backgroundColor: colors.brandPrimary }]}>
                <Icon name={(ICONS[item.type] || "bell") as any} size={18} color={item.is_read ? colors.muted : "#FFF"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.msg}>{item.message}</Text>
                <Text style={s.time}>{formatDateTime(item.created_at)}</Text>
              </View>
              {!item.is_read && <View style={s.dot} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  readAll: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  item: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md },
  itemUnread: { backgroundColor: c.brandTertiary, borderColor: c.brandPrimary },
  iconBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  msg: { fontSize: 13, color: c.onSurfaceSecondary, marginTop: 1 },
  time: { fontSize: 11, color: c.muted, marginTop: 3 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.brandSecondary, marginTop: 4 },
}));
