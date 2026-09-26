import React from "react";
import { View, Text, ScrollView, Dimensions, Pressable, Linking, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme, font } from "@/src/theme";
import { apiGet, apiPost, fileUrl } from "@/src/api";
import { useAuth, isRcg } from "@/src/auth";
import { rupiah, formatDate, formatDateTime, statusMeta, fileSize } from "@/src/format";
import { ScreenHeader, Badge, Loading, ErrorState, Button, Card, Icon, spacing, radius } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useConfirm } from "@/src/components/confirm";
import { useShareAsset } from "@/src/components/share";
import { AssetMap } from "@/src/components/asset-map";

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
  const [openingDoc, setOpeningDoc] = React.useState<string | null>(null);
  const { share, sheet } = useShareAsset();

  const openDoc = async (d: any) => {
    setOpeningDoc(d.id);
    try {
      const r = await apiGet(`/assets/${id}/documents/${d.id}/link`);
      await Linking.openURL(fileUrl(r.url) as string);
    } catch (e: any) {
      toast(e.message || "Gagal membuka dokumen", "error");
    } finally {
      setOpeningDoc(null);
    }
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["asset-internal", id],
    queryFn: () => apiGet(`/assets/${id}`),
  });

  const invalidateAll = () => {
    qc.invalidateQueries();
  };

  const doAction = async (fn: () => Promise<any>, successMsg: string, goBack = true) => {
    setBusy(true);
    try {
      await fn();
      toast(successMsg, "success");
      invalidateAll();
      if (goBack) router.back(); else refetch();
    } catch (e: any) {
      toast(e.message || "Gagal", "error");
      refetch();
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    confirm({ title: "Kirim Asset", message: "Asset akan dikirim ke ACRM untuk direview. Lanjutkan?", confirmText: "Kirim" })
      .then((r) => r.ok && doAction(() => apiPost(`/assets/${id}/submit`), "Asset berhasil disubmit"));

  const acrmApprove = () =>
    confirm({ title: "Setujui Asset", message: "Asset akan diteruskan ke Admin RCG untuk approval final.", confirmText: "Setujui" })
      .then((r) => r.ok && doAction(() => apiPost(`/acrm/assets/${id}/approve`), "Asset disetujui, diteruskan ke RCG"));

  const acrmReturn = () =>
    confirm({ title: "Kembalikan Asset", tone: "danger", confirmText: "Kembalikan", requireNote: true, noteLabel: "Catatan Koreksi (wajib)", notePlaceholder: "Jelaskan yang perlu diperbaiki..." })
      .then((r) => r.ok && doAction(() => apiPost(`/acrm/assets/${id}/return`, { notes: r.note }), "Asset dikembalikan ke Marketing"));

  const rcgApprove = () =>
    confirm({ title: "Publikasikan Asset", message: "Asset akan dipublikasikan ke katalog publik.", confirmText: "Publikasikan" })
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
  const rcgCanAct = isRcg(role) && ["WAITING_RCG_APPROVAL", "UPDATE_PENDING_RCG"].includes(st);
  const rcgCanSell = isRcg(role) && st === "PUBLISHED";
  const rcgCanUnsell = isRcg(role) && st === "SOLD";
  const hasActions = maCanEdit || maCanSubmit || acrmCanAct || rcgCanAct || rcgCanSell || rcgCanUnsell;

  const markSold = () =>
    confirm({ title: "Tandai Terjual", message: "Asset akan ditandai TERJUAL di katalog publik dan kontak WhatsApp PIC disembunyikan agar tidak menerima pertanyaan lagi.", confirmText: "Tandai Terjual", optionalNote: true, noteLabel: "Catatan (opsional)", notePlaceholder: "Mis. terjual di lelang KPKNL tgl ..." })
      .then((r) => r.ok && doAction(() => apiPost(`/rcg/assets/${id}/sold`, { notes: r.note || null }), "Asset ditandai terjual", false));

  const unmarkSold = () =>
    confirm({ title: "Batalkan Status Terjual", message: "Asset akan kembali berstatus PUBLISHED dan kontak PIC tampil lagi.", confirmText: "Batalkan", tone: "danger" })
      .then((r) => r.ok && doAction(() => apiPost(`/rcg/assets/${id}/unsold`), "Status terjual dibatalkan", false));

  return (
    <View style={s.screen}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader title="Detail Asset" subtitle={data.nomor_asset} onBack={() => router.back()}
          right={data.status === "PUBLISHED" || data.status === "SOLD" ? (
            <Pressable onPress={() => share(data)} style={s.headerShare} testID="share-button">
              <Icon name="share-2" size={20} color={colors.onBrandPrimary} />
            </Pressable>
          ) : undefined} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: hasActions ? 120 : insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {images.map((u, i) => <Image key={i} source={{ uri: fileUrl(u) }} style={{ width, height: 220 }} contentFit="cover" />)}
          </ScrollView>
        ) : (
          <View style={s.noImg}><Icon name="image" size={36} color={colors.muted} /><Text style={[font(), { color: colors.muted, marginTop: 6 }]}>Belum ada foto</Text></View>
        )}

        <View style={s.body}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Badge label={meta.label} tone={meta.tone} testID="asset-status-badge" />
            {data.has_schedule && <Badge label="Sudah Ada Jadwal Lelang" tone="warning" />}
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

          <Text style={s.section}>Statistik Minat Pembeli</Text>
          <View style={s.statsRow} testID="interest-stats">
            <View style={s.statBox}><Icon name="eye" size={16} color={colors.brandPrimary} /><Text style={s.statVal}>{data.stats?.views ?? 0}</Text><Text style={s.statLbl}>Dilihat</Text></View>
            <View style={s.statBox}><Icon name="activity" size={16} color={colors.info} /><Text style={s.statVal}>{data.stats?.views_7d ?? 0}</Text><Text style={s.statLbl}>7 hari</Text></View>
            <View style={s.statBox}><Icon name="message-circle" size={16} color={colors.success} /><Text style={s.statVal}>{data.stats?.wa_clicks ?? 0}</Text><Text style={s.statLbl}>Ketuk WA</Text></View>
            <View style={s.statBox}><Icon name="trending-up" size={16} color={colors.success} /><Text style={s.statVal}>{data.stats?.wa_7d ?? 0}</Text><Text style={s.statLbl}>WA 7 hari</Text></View>
          </View>

          <Text style={s.section}>Peta Lokasi</Text>
          {data.latitude != null && data.longitude != null ? (
            <AssetMap latitude={data.latitude} longitude={data.longitude} height={200} testID="asset-map" />
          ) : (
            <View style={s.noMap} testID="asset-map-empty">
              <Icon name="map" size={20} color={colors.muted} />
              <Text style={s.noMapTxt}>Titik koordinat belum diisi{maCanEdit ? ". Tambahkan lewat Edit → Lokasi." : "."}</Text>
            </View>
          )}

          <Text style={s.section}>Deskripsi</Text>
          <Text style={s.desc}>{data.deskripsi}</Text>

          {/* Private legal documents (internal only) */}
          <View style={s.docHead}>
            <Text style={s.section}>Dokumen Legal</Text>
            <View style={s.privBadge}><Icon name="lock" size={11} color={colors.onSurfaceSecondary} /><Text style={s.privTxt}>Privat • Internal</Text></View>
          </View>
          <Card testID="documents-card">
            {(data.documents || []).length === 0 ? (
              <Text style={[font(), { color: colors.muted }]}>Belum ada dokumen legal.{maCanEdit ? " Tambahkan lewat Edit → Dokumen." : ""}</Text>
            ) : (
              (data.documents || []).map((d: any) => (
                <Pressable key={d.id} style={s.docRow} onPress={() => openDoc(d)} testID={`doc-${d.id}`}>
                  <View style={s.docIcon}><Icon name={d.content_type === "application/pdf" ? "file-text" : "image"} size={18} color={colors.brandPrimary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.docName} numberOfLines={1}>{d.nama_file}</Text>
                    <Text style={s.docMeta}>{d.jenis_dokumen} • {fileSize(d.size)} • {formatDate(d.created_at)}</Text>
                  </View>
                  {openingDoc === d.id ? <ActivityIndicator size="small" color={colors.brandPrimary} /> : <Icon name="external-link" size={16} color={colors.muted} />}
                </Pressable>
              ))
            )}
          </Card>

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
              <Text style={[font(), { color: colors.muted }]}>Belum ada aktivitas.</Text>
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
                    {h.notes ? <Text style={s.timeNote}>{`"${h.notes}"`}</Text> : null}
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
              <Button title="Kirim ke ACRM" icon="send" onPress={submit} loading={busy} testID="submit-asset-button" />
            </View>
          )}
          {rcgCanSell && (
            <View style={{ flex: 1 }}>
              <Button title="Tandai Terjual" icon="tag" variant="secondary" onPress={markSold} loading={busy} testID="mark-sold-button" />
            </View>
          )}
          {rcgCanUnsell && (
            <View style={{ flex: 1 }}>
              <Button title="Batalkan Terjual" icon="rotate-ccw" variant="outline" onPress={unmarkSold} loading={busy} testID="unmark-sold-button" />
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
      {sheet}
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
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statBox: { flex: 1, alignItems: "center", gap: 2, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingVertical: 10 },
  statVal: { fontSize: 16, fontWeight: "900", color: c.onSurface },
  statLbl: { fontSize: 10, color: c.muted },
  headerShare: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  noMap: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.md },
  noMapTxt: { flex: 1, fontSize: 13, color: c.muted, lineHeight: 18 },
  docHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm },
  privBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surfaceTertiary, paddingHorizontal: 8, height: 24, borderRadius: radius.pill },
  privTxt: { fontSize: 11, fontWeight: "700", color: c.onSurfaceSecondary },
  docRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.divider },
  docIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  docMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
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
