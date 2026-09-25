import React, { useState } from "react";
import { View, Text, ScrollView, FlatList, Pressable, RefreshControl, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, apiPost, apiPut } from "@/src/api";
import { formatDateTime } from "@/src/format";
import {
  ScreenHeader, Card, Badge, Field, Select, Button, Icon, Loading, ErrorState, EmptyState, spacing, radius,
} from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useConfirm } from "@/src/components/confirm";

const TABS = [
  { key: "users", label: "User", icon: "users" },
  { key: "kategori", label: "Kategori", icon: "grid" },
  { key: "audit", label: "Audit", icon: "shield" },
];

export default function Manage() {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const [tab, setTab] = useState("users");

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Kelola" subtitle="Master data & audit" />
      <View style={s.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => setTab(t.key)} testID={`manage-tab-${t.key}`}>
            <Icon name={t.icon as any} size={16} color={tab === t.key ? colors.brandPrimary : colors.muted} />
            <Text style={[s.tabTxt, tab === t.key && { color: colors.brandPrimary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "users" && <UsersTab />}
      {tab === "kategori" && <KategoriTab />}
      {tab === "audit" && <AuditTab />}
    </View>
  );
}

// -------- Users --------
function UsersTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [roleFilter, setRoleFilter] = useState("");
  const [kw, setKw] = useState("");
  const [search, setSearch] = useState("");
  const [editRow, setEditRow] = useState<any>(null);

  const q = `${roleFilter ? `role=${roleFilter}&` : ""}${search ? `keyword=${encodeURIComponent(search)}` : ""}`;
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["admin-users", roleFilter, search],
    queryFn: () => apiGet(`/admin/users${q ? `?${q}` : ""}`),
  });
  const { data: acrs } = useQuery({ queryKey: ["admin-acr"], queryFn: () => apiGet("/admin/acr") });

  const toggle = async (row: any) => {
    const kind = row.role === "acrm" ? "acrm" : "marketing-asset";
    const r = await confirm({ title: row.status === "active" ? "Nonaktifkan User" : "Aktifkan User", message: `${row.nama} akan ${row.status === "active" ? "dinonaktifkan (tidak bisa login)" : "diaktifkan kembali"}.`, confirmText: "Ya", tone: row.status === "active" ? "danger" : "primary" });
    if (!r.ok) return;
    try { await apiPost(`/admin/${kind}/${row.id}/toggle`); qc.invalidateQueries({ queryKey: ["admin-users"] }); toast("Status diperbarui", "success"); }
    catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Icon name="search" size={16} color={colors.muted} />
          <TextInput value={kw} onChangeText={setKw} onSubmitEditing={() => setSearch(kw.trim())} returnKeyType="search"
            placeholder="Cari nama / NIP" placeholderTextColor={colors.muted} style={s.searchInput} testID="user-search" />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        {[{ k: "", l: "Semua" }, { k: "acrm", l: "ACRM" }, { k: "marketing_asset", l: "Marketing" }].map((f) => (
          <Pressable key={f.k} style={[s.chip, roleFilter === f.k && s.chipActive]} onPress={() => setRoleFilter(f.k)} testID={`role-${f.k || "all"}`}>
            <Text style={[s.chipTxt, roleFilter === f.k && s.chipTxtActive]}>{f.l}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? <Loading /> : isError ? <ErrorState onRetry={refetch} /> : (data || []).length === 0 ? <EmptyState icon="users" title="Tidak ada user" /> : (
        <FlatList
          data={data}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing["2xl"] }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.uName}>{item.nama}</Text>
                  <Text style={s.uMeta}>NIP {item.nip}</Text>
                  <Text style={s.uMeta}>{item.acr}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Badge label={item.role === "acrm" ? "ACRM" : "Marketing"} tone="brand" />
                    <Badge label={item.status === "active" ? "Aktif" : "Nonaktif"} tone={item.status === "active" ? "success" : "neutral"} />
                    {item.data_flag === "PERLU_KONFIRMASI_DATA" && <Badge label="Perlu Konfirmasi" tone="warning" />}
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}><Button title="Edit" variant="outline" icon="edit-2" onPress={() => setEditRow(item)} testID={`edit-${item.id}`} /></View>
                <View style={{ flex: 1 }}><Button title={item.status === "active" ? "Nonaktifkan" : "Aktifkan"} variant={item.status === "active" ? "danger" : "primary"} onPress={() => toggle(item)} testID={`toggle-${item.id}`} /></View>
              </View>
            </Card>
          )}
        />
      )}

      {editRow && (
        <EditUserModal row={editRow} acrs={acrs || []} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); qc.invalidateQueries({ queryKey: ["admin-users"] }); }} />
      )}
    </View>
  );
}

function EditUserModal({ row, acrs, onClose, onSaved }: any) {
  const s = useStyles();
  const toast = useToast();
  const confirm = useConfirm();
  const [nama, setNama] = useState(row.nama === "NOPE" ? "" : row.nama);
  const [hp, setHp] = useState(row.nomor_hp || "");
  const [newAcr, setNewAcr] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const isAcrm = row.role === "acrm";
  const base = isAcrm ? "acrm" : "marketing-asset";

  const save = async () => {
    if (!nama.trim()) { toast("Nama wajib diisi", "error"); return; }
    setBusy(true);
    try {
      await apiPut(`/admin/${base}/${row.id}`, { nama: nama.trim(), nomor_hp: hp || undefined });
      toast("Data diperbarui", "success");
      onSaved();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const mutasi = async () => {
    if (!newAcr) { toast("Pilih ACR tujuan", "error"); return; }
    if (!reason.trim()) { toast("Alasan mutasi wajib diisi", "error"); return; }
    const r = await confirm({ title: "Konfirmasi Mutasi", message: `Pindahkan ${row.nama} ke ACR tujuan?`, confirmText: "Mutasi" });
    if (!r.ok) return;
    setBusy(true);
    try {
      await apiPost(`/admin/${base}/${row.id}/mutasi`, { new_acr_id: newAcr, reason: reason.trim() });
      toast("Mutasi berhasil", "success");
      onSaved();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  return (
    <View style={s.modalWrap}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <View style={s.modalCard}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <Text style={s.modalTitle}>Edit {isAcrm ? "ACRM" : "Marketing"}</Text>
            <Pressable onPress={onClose}><Icon name="x" size={22} color="#1F2937" /></Pressable>
          </View>
          <View style={{ gap: spacing.md }}>
            <Field label="Nama" value={nama} onChangeText={setNama} placeholder="Nama lengkap" testID="edit-nama" />
            {!isAcrm && <Field label="No. HP (0xxx, 10-12 digit)" value={hp} onChangeText={setHp} keyboardType="phone-pad" testID="edit-hp" />}
            <Button title="Simpan Perubahan" onPress={save} loading={busy} testID="save-user" />

            <View style={s.divider} />
            <Text style={s.modalSub}>Mutasi ACR</Text>
            <Select label="ACR Tujuan" value={newAcr}
              options={acrs.map((a: any) => ({ value: a.id, label: a.nama_acr }))}
              onChange={setNewAcr} testID="mutasi-acr" />
            <Field label="Alasan Mutasi (wajib)" value={reason} onChangeText={setReason} multiline testID="mutasi-reason" />
            <Button title="Proses Mutasi" variant="outline" icon="shuffle" onPress={mutasi} loading={busy} testID="do-mutasi" />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// -------- Kategori --------
function KategoriTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ["all-categories"], queryFn: () => apiGet("/master/categories?active_only=false") });

  const add = async () => {
    if (!name.trim()) { toast("Nama kategori wajib diisi", "error"); return; }
    setBusy(true);
    try {
      await apiPost("/admin/category", { nama_category: name.trim(), parent_category_id: parent });
      toast("Kategori ditambahkan", "success");
      setName(""); setParent(null);
      qc.invalidateQueries({ queryKey: ["all-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const toggle = async (id: string) => {
    try { await apiPost(`/admin/category/${id}/toggle`); qc.invalidateQueries({ queryKey: ["all-categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const parents = data || [];

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
      <Card>
        <Text style={s.cardTitle}>Tambah Kategori</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Select label="Induk (kosongkan untuk kategori utama)" value={parent}
            options={[{ value: "", label: "— Kategori Utama —" }, ...parents.map((p: any) => ({ value: p.id, label: p.nama_category }))]}
            onChange={(v) => setParent(v || null)} testID="parent-category" />
          <Field label="Nama Kategori" value={name} onChangeText={setName} placeholder="mis. Kapal / Mesin" testID="new-category-name" />
          <Button title="Tambah" icon="plus" onPress={add} loading={busy} testID="add-category" />
        </View>
      </Card>

      {isLoading ? <Loading /> : parents.map((p: any) => (
        <Card key={p.id}>
          <View style={s.catHead}>
            <Text style={s.catName}>{p.nama_category}</Text>
            <Pressable onPress={() => toggle(p.id)} testID={`toggle-cat-${p.id}`}>
              <Badge label={p.status === "active" ? "Aktif" : "Nonaktif"} tone={p.status === "active" ? "success" : "neutral"} />
            </Pressable>
          </View>
          {(p.subcategories || []).map((sub: any) => (
            <View key={sub.id} style={s.subRow}>
              <Text style={s.subName}>• {sub.nama_category}</Text>
              <Pressable onPress={() => toggle(sub.id)} testID={`toggle-cat-${sub.id}`}>
                <Badge label={sub.status === "active" ? "Aktif" : "Nonaktif"} tone={sub.status === "active" ? "success" : "neutral"} />
              </Pressable>
            </View>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}

// -------- Audit --------
function AuditTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: ["audit"], queryFn: () => apiGet("/admin/audit-logs?limit=100") });

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState onRetry={refetch} />;
  return (
    <FlatList
      data={data || []}
      keyExtractor={(it) => it.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing["2xl"] }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListEmptyComponent={<EmptyState icon="shield" title="Belum ada aktivitas" />}
      renderItem={({ item }) => (
        <View style={s.auditRow}>
          <View style={s.auditDot} />
          <View style={{ flex: 1 }}>
            <Text style={s.auditAction}>{item.action} • {item.entity}</Text>
            <Text style={s.auditMeta}>{item.user} ({item.role})</Text>
            <Text style={s.auditTime}>{formatDateTime(item.timestamp)}</Text>
            {item.notes ? <Text style={s.auditNote}>{item.notes}</Text> : null}
          </View>
        </View>
      )}
    />
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  tabRow: { flexDirection: "row", backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
  tab: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: c.brandPrimary },
  tabTxt: { fontSize: 13, fontWeight: "700", color: c.muted },
  filterBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: c.onSurface },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipTxt: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 13 },
  chipTxtActive: { color: c.onBrandPrimary },
  uName: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  uMeta: { fontSize: 12, color: c.muted },
  modalWrap: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, justifyContent: "flex-end" },
  modalBackdrop: { ...({ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 } as any), backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "88%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  modalSub: { fontSize: 14, fontWeight: "800", color: c.onSurface },
  divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  catHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catName: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  subRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  subName: { fontSize: 14, color: c.onSurfaceSecondary },
  auditRow: { flexDirection: "row", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brandPrimary, marginTop: 5 },
  auditAction: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  auditMeta: { fontSize: 12, color: c.onSurfaceSecondary },
  auditTime: { fontSize: 11, color: c.muted, marginTop: 1 },
  auditNote: { fontSize: 12, color: c.onSurfaceSecondary, fontStyle: "italic", marginTop: 2 },
}));
