import React from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { makeStyles, useTheme, font } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useAuth } from "@/src/auth";
import { ScreenHeader, StatCard, Loading, ErrorState, Card, Icon, spacing } from "@/src/components/ui";
import { STATUS_META, statusMeta } from "@/src/format";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "marketing_asset") return <MarketingDash />;
  if (user.role === "acrm") return <AcrmDash />;
  return <RcgDash />;
}

function useDash(path: string, key: string) {
  return useQuery({ queryKey: [key], queryFn: () => apiGet(path) });
}

function Wrap({ title, subtitle, children, loading, error, refetch, refreshing }: any) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={title} subtitle={subtitle} />
      {loading ? <Loading /> : error ? <ErrorState onRetry={refetch} message="Gagal memuat dashboard" /> : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }}
          refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={refetch} />}
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

function MarketingDash() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useDash("/dashboard/marketing", "dash-ma");
  const st = data?.by_status || {};
  return (
    <Wrap title={`Halo, ${user?.nama?.split(" ")[0] || ""}`} subtitle={data?.acr} loading={isLoading} error={isError} refetch={refetch} refreshing={isRefetching}>
      <Text style={styleLabel}>Ringkasan Asset Saya</Text>
      <View style={row}>
        <StatCard label="Total Asset" value={data?.total ?? 0} tone="brand" icon="layers" />
        <StatCard label="Draft" value={st.DRAFT ?? 0} tone="neutral" icon="edit-3" />
        <StatCard label="Menunggu ACRM" value={st.WAITING_ACRM_REVIEW ?? 0} tone="warning" icon="clock" />
      </View>
      <View style={row}>
        <StatCard label="Dikembalikan" value={(st.RETURN_TO_MARKETING ?? 0) + (st.RETURN_FROM_RCG ?? 0)} tone="error" icon="corner-up-left" />
        <StatCard label="Menunggu RCG" value={st.WAITING_RCG_APPROVAL ?? 0} tone="warning" icon="clock" />
        <StatCard label="Dipublikasikan" value={st.PUBLISHED ?? 0} tone="success" icon="check-circle" />
      </View>
      <View style={row}>
        <StatCard label="Update Pending" value={(st.UPDATE_PENDING_ACRM ?? 0) + (st.UPDATE_PENDING_RCG ?? 0)} tone="info" icon="refresh-cw" />
        <StatCard label="Terjual" value={st.SOLD ?? 0} tone="info" icon="tag" />
        <View style={{ flex: 1, minWidth: "30%" }} />
      </View>

      <Text style={styleLabel}>Statistik Minat Pembeli</Text>
      <View style={row}>
        <StatCard label="Dilihat (total)" value={data?.interest?.views ?? 0} tone="brand" icon="eye" />
        <StatCard label="Dilihat 7 hari" value={data?.interest?.views_7d ?? 0} tone="info" icon="activity" />
      </View>
      <View style={row}>
        <StatCard label="Ketuk WhatsApp" value={data?.interest?.wa_clicks ?? 0} tone="success" icon="message-circle" />
        <StatCard label="WhatsApp 7 hari" value={data?.interest?.wa_7d ?? 0} tone="success" icon="trending-up" />
      </View>
      <InterestTop rows={data?.interest?.top || []} />
    </Wrap>
  );
}

function InterestTop({ rows }: { rows: any[] }) {
  const s = useStyles();
  const router = useRouter();
  const { colors } = useTheme();
  if (!rows.length) return null;
  return (
    <Card testID="interest-top">
      <Text style={s.cardTitle}>Asset Paling Diminati</Text>
      <Text style={s.cardHint}>Fokuskan tindak lanjut pada asset dengan ketukan WhatsApp tertinggi.</Text>
      {rows.map((r, i) => (
        <Pressable key={r.id} style={s.topRow} onPress={() => router.push(`/detail/${r.id}`)} testID={`interest-row-${r.id}`}>
          <View style={s.rank}><Text style={s.rankTxt}>{i + 1}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.topTitle} numberOfLines={1}>{r.judul_asset}</Text>
            <Text style={s.topMeta}>{r.nomor_asset} • {statusMeta(r.status).label}</Text>
          </View>
          <View style={s.metric}><Icon name="eye" size={12} color={colors.muted} /><Text style={s.metricTxt}>{r.views}</Text></View>
          <View style={s.metric}><Icon name="message-circle" size={12} color={colors.success} /><Text style={[s.metricTxt, { color: colors.success }]}>{r.wa_clicks}</Text></View>
        </Pressable>
      ))}
    </Card>
  );
}

function AcrmDash() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useDash("/dashboard/acrm", "dash-acrm");
  const st = data?.by_status || {};
  return (
    <Wrap title="Dashboard ACRM" subtitle={data?.acr} loading={isLoading} error={isError} refetch={refetch} refreshing={isRefetching}>
      <Text style={styleLabel}>Ringkasan Area</Text>
      <View style={row}>
        <StatCard label="Total Asset" value={data?.total ?? 0} tone="brand" icon="layers" />
        <StatCard label="Menunggu Review" value={(st.WAITING_ACRM_REVIEW ?? 0) + (st.UPDATE_PENDING_ACRM ?? 0)} tone="warning" icon="inbox" />
        <StatCard label="Diteruskan RCG" value={st.WAITING_RCG_APPROVAL ?? 0} tone="info" icon="send" />
      </View>
      <View style={row}>
        <StatCard label="Dikembalikan" value={st.RETURN_TO_MARKETING ?? 0} tone="error" icon="corner-up-left" />
        <StatCard label="Dipublikasikan" value={st.PUBLISHED ?? 0} tone="success" icon="check-circle" />
        <View style={{ flex: 1, minWidth: "30%" }} />
      </View>
    </Wrap>
  );
}

function RcgDash() {
  const { data, isLoading, isError, refetch, isRefetching } = useDash("/dashboard/rcg", "dash-rcg");
  const s = useStyles();
  const { colors } = useTheme();
  const t = data?.totals || {};
  const st = data?.by_status || {};
  const perAcr: any[] = data?.per_acr || [];
  return (
    <Wrap title="Monitoring Nasional" subtitle="Admin RCG Kantor Pusat" loading={isLoading} error={isError} refetch={refetch} refreshing={isRefetching}>
      <Text style={styleLabel}>Organisasi</Text>
      <View style={row}>
        <StatCard label="Total ACR" value={t.acr ?? 0} tone="brand" icon="map" />
        <StatCard label="Total ACRM" value={t.acrm ?? 0} tone="brand" icon="user-check" />
        <StatCard label="Marketing Asset" value={t.marketing_asset ?? 0} tone="brand" icon="users" />
      </View>
      <Text style={styleLabel}>Asset</Text>
      <View style={row}>
        <StatCard label="Total Asset" value={t.asset ?? 0} tone="neutral" icon="layers" />
        <StatCard label="Dipublikasikan" value={st.PUBLISHED ?? 0} tone="success" icon="check-circle" />
        <StatCard label="Ada Jadwal Lelang" value={t.with_schedule ?? 0} tone="warning" icon="calendar" />
      </View>
      <View style={row}>
        <StatCard label="Menunggu ACRM" value={st.WAITING_ACRM_REVIEW ?? 0} tone="warning" icon="clock" />
        <StatCard label="Menunggu RCG" value={(st.WAITING_RCG_APPROVAL ?? 0) + (st.UPDATE_PENDING_RCG ?? 0)} tone="warning" icon="clock" />
        <StatCard label="Dikembalikan" value={(st.RETURN_TO_MARKETING ?? 0) + (st.RETURN_FROM_RCG ?? 0)} tone="error" icon="corner-up-left" />
      </View>

      <Text style={styleLabel}>Monitoring per ACR</Text>
      <Card>
        <View style={s.tblHead}>
          <Text style={[s.th, { flex: 2 }]}>ACR</Text>
          <Text style={s.th}>Total</Text>
          <Text style={s.th}>Pub</Text>
          <Text style={s.th}>Pend</Text>
          <Text style={s.th}>Ret</Text>
        </View>
        {perAcr.filter((a) => a.total > 0).length === 0 && (
          <Text style={[font(), { color: colors.muted, paddingVertical: 12, textAlign: "center" }]}>Belum ada asset diinput.</Text>
        )}
        {perAcr.filter((a) => a.total > 0).map((a) => (
          <View key={a.nama_acr} style={s.tblRow}>
            <Text style={[s.td, { flex: 2, fontWeight: "600" }]} numberOfLines={1}>{a.nama_acr.replace("ACR ", "")}</Text>
            <Text style={s.td}>{a.total}</Text>
            <Text style={[s.td, { color: colors.success }]}>{a.published}</Text>
            <Text style={[s.td, { color: colors.warning }]}>{a.pending}</Text>
            <Text style={[s.td, { color: colors.error }]}>{a.returned}</Text>
          </View>
        ))}
      </Card>
    </Wrap>
  );
}

const row = { flexDirection: "row" as const, gap: spacing.sm };
const styleLabel = { fontSize: 15, fontWeight: "800" as const, color: "#1F2937", marginTop: 4 };

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  tblHead: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  th: { flex: 1, fontSize: 11, fontWeight: "700", color: c.muted, textAlign: "center" },
  tblRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.divider },
  td: { flex: 1, fontSize: 12, color: c.onSurface, textAlign: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  cardHint: { fontSize: 12, color: c.muted, marginTop: 2, marginBottom: spacing.sm },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.divider },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rankTxt: { fontSize: 12, fontWeight: "800", color: c.brandPrimary },
  topTitle: { fontSize: 13, fontWeight: "700", color: c.onSurface },
  topMeta: { fontSize: 11, color: c.muted, marginTop: 1 },
  metric: { flexDirection: "row", alignItems: "center", gap: 3, minWidth: 40, justifyContent: "flex-end" },
  metricTxt: { fontSize: 12, fontWeight: "700", color: c.onSurfaceSecondary },
}));
