import React from "react";
import { View, Text, ScrollView, Dimensions, Pressable } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, apiPost, fileUrl } from "@/src/api";
import { useAuth } from "@/src/auth";
import { rupiah, formatDate, formatDateTime, statusMeta } from "@/src/format";
import { ScreenHeader, Badge, Loading, ErrorState, Button, Card, Icon, spacing, radius } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useConfirm } from "@/src/components/confirm";

const { width } = Dimensions.get("window");

export default function InternalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["asset-internal", id],
    queryFn: () => apiGet(`/assets/${id}`),
  });

  const invalidateAll = () => {
    qc.invalidateQueries();
  };

  const doAction = async (fn: () => Promise<any>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(successMsg, "success");
      invalidateAll();
      router.back();
    } catch (e: any) {
      toast(e.message || "Gagal", "error");
      refetch();
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    confirm({ title: "Submit Asset", message: "Asset akan dikirim ke ACRM untuk direview. Lanjutkan?", confirmText: "Submit" })
      .then((r) => r.ok && doAction(() => apiPost(`/assets/${id}/submit`), "Asset berhasil disubmit"));

  const acrmApprove = () =>
    confirm({ title: "Setujui Asset", message: "Asset akan diteruskan ke Admin RCG untuk approval final.", confirmText: "Setujui" })
      .then((r) => r.ok && doAction(() => apiPost(`/acrm/assets/${id}/approve`), "Asset disetujui, diteruskan ke RCG"));

  const acrmReturn = () =>
    confirm({ title: "Kembalikan Asset", tone: "danger", confirmText: "Kembalikan", requireNote: true, noteLabel: "Catatan Koreksi (wajib)", notePlaceholder: "Jelaskan yang perlu diperbaiki..." })
      .then((r) => r.ok && doAction(() => apiPost(`/acrm/assets/${id}/return`, { notes: r.note }), "Asset dikembalikan ke Marketing"));

  const rcgApprove = () =>
    confirm({ title: "Publikasikan Asset", message: "Asset akan dipublikasikan ke katalog publik.", confirmText: "Publish" })
      .then((r) => r.ok && doAction(() => apiPost(`/rcg/assets/${id}/approve`), "Asset dipublikasikan"));

  const rcgReturn = () =>
    confirm({ title: "Kembalikan Asset", tone: "danger", confirmText: "Kembalikan", requireNote: true, noteLabel: "Catatan Koreksi (wajib)", notePlaceholder: "Jelaskan yang perlu diperbaiki..." })
      .then((r) => r.ok && doAction(() => apiPost(`/rcg/assets/${id}/return`, { notes: r.note }), "Asset dikembalikan"));

  if (isLoading) return <View style={s.screen}><View style={{ paddingTop: insets.top }}><ScreenHeader title="Detail Asset" onBack={() => router.back()} /></View><Loading /></View>;
  if (isError || !data) return <View style={s.screen}><View style={{ paddingTop: insets.top }}><ScreenHeader title="Detail Asset" onBack={() => router.back()} /></View><ErrorState onRetry={refetch} /></View>;

  const meta = statusMeta(data.status);
  const images: string[] = data.images || [];
  const role = user?.role;
  const st = data.status;

  const maCanEdit = role === "marketing_asset" && ["DRAFT", "RETURN_TO_MARKETING", "RETURN_FROM_RCG", "PUBLISHED", "SOLD"].includes(st);
  const maCanSubmit = role === "marketing_asset" && ["DRAFT", "RETURN_TO_MARKETING", "RETURN_FROM_RCG"].includes(st);
  const maCanUpdate = role === "marketing_asset" && ["PUBLISHED", "SOLD"].includes(st);
  const acrmCanAct = role === "acrm" && ["WAITING_ACRM_REVIEW", "UPDATE_PENDING_ACRM"].includes(st);
  const rcgCanAct = role === "admin_rcg" && ["WAITING_RCG_APPROVAL", "UPDATE_PENDING_RCG"].includes(st);
  const hasActions = maCanEdit || maCanSubmit || acrmCanAct || rcgCanAct;

  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader title="Detail Asset" subtitle={data.nomor_asset} onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: hasActions ? 120 : insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {images.map((u, i) => <Image key={i} source={{ uri: fileUrl(u) }} style={{ width, height: 220 }} contentFit="cover" />)}
          </ScrollView>
        ) : (
          <View style={s.noImg}><Icon name="image" size={36} color={colors.muted} /><Text style={{ color: colors.muted, marginTop: 6 }}>Belum ada foto</Text></View>
        )}

        <View style={s.body}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Badge label={meta.label} tone={meta.tone} testID="asset-status-badge" />
            {data.has_schedule && <Badge label="Ada Lelang" tone="warning" />}
          </View>
          <Text style={s.title}>{data.judul_asset}</Text>
          <Text style={s.price}>{rupiah(data.harga_limit)}</Text>

          {data.correction_notes && ["RETURN_TO_MARKETING", "RETURN_FROM_RCG"].includes(st) && (
            <View style={s.noteBox} testID="correction-note">
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                <Icon name="alert-triangle" size={16} color={colors.error} />
                <Text style={s.noteTitle}>Catatan Koreksi</Text>
              </View>
              <Text style={s.noteTxt}>{data.correction_notes}</Text>
            </View>
          )}

          <Card>
            <Info label="Kategori" value={`${data.kategori}${data.subkategori ? " • " + data.subkategori : ""}`} />
            <Info label="Lokasi" value={[data.wilayah_level_4, data.kecamatan, data.kabupaten_kota, data.provinsi].filter(Boolean).join(", ")} />
            <Info label="Alamat" value={data.alamat} />
            {data.luas_tanah != null && <Info label="Luas Tanah" value={`${data.luas_tanah} m²`} />}
            {data.luas_bangunan != null && <Info label="Luas Bangunan" value={`${data.luas_bangunan} m²`} />}
            {data.kondisi_asset && <Info label="Kondisi" value={data.kondisi_asset} />}
            {data.nilai_appraisal != null && <Info label="Nilai Appraisal" value={rupiah(data.nilai_appraisal)} />}
          </Card>

          <Text style={s.section}>Deskripsi</Text>
          <Text style={s.desc}>{data.deskripsi}</Text>

          <Card>
            <Info label="ACR" value={data.acr_nama} />
            <Info label="ACRM (Checker)" value={data.acrm_nama} />
            <Info label="Marketing Asset (PIC)" value={data.pic_nama} />
          </Card>

          {data.has_schedule && (
            <Card>
              <Text style={s.section}>Jadwal Lelang</Text>
              <Info label="Tanggal" value={formatDate(data.tanggal_lelang)} />
              {data.kpknl && <Info label="KPKNL" value={data.kpknl.nama} />}
            </Card>
          )}

          {/* Approval timeline */}
          <Text style={s.section}>Riwayat Approval</Text>
          <Card>
            {(data.approval_history || []).length === 0 ? (
              <Text style={{ color: colors.muted }}>Belum ada aktivitas.</Text>
            ) : (
              (data.approval_history || []).map((h: any, i: number) => (
                <View key={h.id} style={s.timeItem}>
                  <View style={s.timeDotCol}>
                    <View style={s.timeDot} />
                    {i < data.approval_history.length - 1 && <View style={s.timeLine} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 12 }}>
                    <Text style={s.timeAction}>{actionLabel(h.action)}</Text>
                    <Text style={s.timeMeta}>{h.reviewer_name || "-"} • {formatDateTime(h.timestamp)}</Text>
                    {h.notes ? <Text style={s.timeNote}>"{h.notes}"</Text> : null}
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      {hasActions && (
        <View style={[s.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
          {maCanEdit && (
            <View style={{ flex: 1 }}>
              <Button title={maCanUpdate ? "Ajukan Update" : "Edit"} icon="edit-2" variant="outline" onPress={() => router.push(`/add?edit=${id}`)} testID="edit-asset-button" />
            </View>
          )}
          {maCanSubmit && (
            <View style={{ flex: 1 }}>
              <Button title="Submit" icon="send" onPress={submit} loading={busy} testID="submit-asset-button" />
            </View>
          )}
          {(acrmCanAct || rcgCanAct) && (
            <>
              <View style={{ flex: 1 }}>
                <Button title="Kembalikan" icon="corner-up-left" variant="outline" onPress={acrmCanAct ? acrmReturn : rcgReturn} loading={busy} testID="return-button" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title={rcgCanAct ? "Publish" : "Setujui"} icon="check" onPress={acrmCanAct ? acrmApprove : rcgApprove} loading={busy} testID="approve-button" />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function actionLabel(a: string) {
  return ({ SUBMIT: "Disubmit Marketing", RESUBMIT: "Disubmit Ulang", APPROVE: "Disetujui", RETURN: "Dikembalikan",
    PUBLISH: "Dipublikasikan RCG", UPDATE_SUBMIT: "Update Disubmit", UPDATE_APPROVE: "Update Disetujui" } as any)[a] || a;
}

function Info({ label, value }: { label: string; value?: string }) {
  const s = useStyles();
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || "-"}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  noImg: { height: 160, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: "800", color: c.onSurface, marginTop: 4 },
  price: { fontSize: 22, fontWeight: "900", color: c.brandPrimary },
  noteBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: radius.md, padding: spacing.md, gap: 4 },
  noteTitle: { fontSize: 13, fontWeight: "800", color: c.error },
  noteTxt: { fontSize: 13, color: "#7F1D1D", lineHeight: 19 },
  section: { fontSize: 15, fontWeight: "800", color: c.onSurface, marginTop: spacing.md },
  desc: { fontSize: 14, color: c.onSurfaceSecondary, lineHeight: 21 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: c.divider },
  infoLabel: { fontSize: 13, color: c.muted, flexShrink: 0 },
  infoValue: { fontSize: 13, color: c.onSurface, fontWeight: "600", flex: 1, textAlign: "right" },
  timeItem: { flexDirection: "row", gap: spacing.md },
  timeDotCol: { alignItems: "center", width: 16 },
  timeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.brandPrimary, marginTop: 3 },
  timeLine: { width: 2, flex: 1, backgroundColor: c.border, marginTop: 2 },
  timeAction: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  timeMeta: { fontSize: 12, color: c.muted, marginTop: 1 },
  timeNote: { fontSize: 13, color: c.onSurfaceSecondary, fontStyle: "italic", marginTop: 2 },
  actionBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
}));
