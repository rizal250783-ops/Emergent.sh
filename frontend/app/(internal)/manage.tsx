import React, { useState } from "react";
import { View, Text, ScrollView, FlatList, Pressable, RefreshControl, TextInput, Linking, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, apiPost, apiPut, apiDelete, fileUrl } from "@/src/api";
import { formatDateTime, rupiah } from "@/src/format";
import {
  ScreenHeader, Card, Badge, Field, Select, Button, Icon, Loading, ErrorState, EmptyState, spacing, radius,
} from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useConfirm } from "@/src/components/confirm";
import { useAuth, isController } from "@/src/auth";

const BASE_TABS = [
  { key: "users", label: "User", icon: "users" },
  { key: "kategori", label: "Kategori", icon: "grid" },
  { key: "deleted", label: "Terhapus", icon: "rotate-ccw" },
  { key: "audit", label: "Audit", icon: "shield" },
  { key: "laporan", label: "Laporan", icon: "file-text" },
];
const RCG_TAB = { key: "rcg", label: "RCG", icon: "user-check" };

export default function Manage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const { user } = useAuth();
  const controller = isController(user?.role);
  const TABS = controller ? [...BASE_TABS, RCG_TAB] : BASE_TABS;
  const [tab, setTab] = useState("users");

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Kelola"
        subtitle="Master data & audit"
        right={
          <Pressable onPress={() => router.push("/")} testID="manage-open-public-catalog" style={s.pubBtn}>
            <Icon name="grid" size={14} color="#FFFFFF" />
            <Text style={s.pubBtnTxt}>Katalog Publik</Text>
          </Pressable>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => setTab(t.key)} testID={`manage-tab-${t.key}`}>
            <Icon name={t.icon as any} size={16} color={tab === t.key ? colors.brandPrimary : colors.muted} />
            <Text style={[s.tabTxt, tab === t.key && { color: colors.brandPrimary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {tab === "users" && <UsersTab />}
      {tab === "kategori" && <KategoriTab />}
      {tab === "deleted" && <DeletedTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "laporan" && <LaporanTab />}
      {tab === "rcg" && controller && <RcgTab />}
    </View>
  );
}

// -------- RCG user management (Full Controller only) --------
function RcgTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { user, refresh } = useAuth();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["rcg-users"],
    queryFn: () => apiGet("/admin/rcg-users"),
  });

  const [addName, setAddName] = useState("");
  const [addNip, setAddNip] = useState("");
  const [busy, setBusy] = useState(false);

  const addAdmin = async () => {
    if (!addName.trim() || !addNip.trim()) { toast("Nama dan NIP wajib diisi", "error"); return; }
    setBusy(true);
    try {
      await apiPost("/admin/rcg-users", { nama: addName.trim(), nip: addNip.trim() });
      toast("RCG Admin ditambahkan (password: BSI@2026)", "success");
      setAddName(""); setAddNip("");
      qc.invalidateQueries({ queryKey: ["rcg-users"] });
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const toggle = async (row: any) => {
    const r = await confirm({ title: row.status === "active" ? "Nonaktifkan RCG Admin" : "Aktifkan RCG Admin", message: `${row.nama} akan ${row.status === "active" ? "dinonaktifkan (tidak bisa login)" : "diaktifkan kembali"}.`, confirmText: "Ya", tone: row.status === "active" ? "danger" : "primary" });
    if (!r.ok) return;
    try { await apiPost(`/admin/rcg-users/${row.id}/toggle`); qc.invalidateQueries({ queryKey: ["rcg-users"] }); toast("Status diperbarui", "success"); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const remove = async (row: any) => {
    const r = await confirm({ title: "Hapus RCG Admin", message: `Hapus akun ${row.nama} secara permanen dari daftar RCG?`, confirmText: "Hapus", tone: "danger" });
    if (!r.ok) return;
    try { await apiDelete(`/admin/rcg-users/${row.id}`); qc.invalidateQueries({ queryKey: ["rcg-users"] }); toast("RCG Admin dihapus", "success"); }
    catch (e: any) { toast(e.message, "error"); }
  };

  // Self profile edit
  const [selfOpen, setSelfOpen] = useState(false);
  const [sName, setSName] = useState(user?.nama || "");
  const [sNip, setSNip] = useState(user?.username || "");
  const [sPw, setSPw] = useState("");
  const [selfBusy, setSelfBusy] = useState(false);
  React.useEffect(() => { setSName(user?.nama || ""); setSNip(user?.username || ""); }, [user?.nama, user?.username]);

  const saveSelf = async () => {
    if (!sName.trim() || !sNip.trim()) { toast("Nama dan NIP wajib diisi", "error"); return; }
    setSelfBusy(true);
    try {
      await apiPut("/admin/rcg/self", { nama: sName.trim(), nip: sNip.trim(), new_password: sPw || undefined });
      toast("Data diri diperbarui", "success");
      setSPw(""); setSelfOpen(false);
      await refresh();
      qc.invalidateQueries({ queryKey: ["rcg-users"] });
    } catch (e: any) { toast(e.message, "error"); } finally { setSelfBusy(false); }
  };

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState onRetry={refetch} />;
  const rows: any[] = data || [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }}>
      <Card>
        <Pressable style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} onPress={() => setSelfOpen((v) => !v)} testID="toggle-self-edit">
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View style={s.ctrlBadge}><Icon name="award" size={14} color={colors.onBrandSecondary} /></View>
            <Text style={s.cardTitle}>Ubah Data Diri Saya</Text>
          </View>
          <Icon name={selfOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
        </Pressable>
        <Text style={s.selfHint}>Sebagai Full Controller, Anda dapat mengganti nama, NIP, dan password sendiri (mis. saat mutasi jabatan).</Text>
        {selfOpen && (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Field label="Nama Lengkap" value={sName} onChangeText={setSName} testID="self-nama" />
            <Field label="NIP (username login)" value={sNip} onChangeText={setSNip} autoCapitalize="none" testID="self-nip" />
            <Field label="Password Baru (opsional)" value={sPw} onChangeText={setSPw} secureTextEntry autoCapitalize="none" placeholder="Kosongkan bila tidak diubah" testID="self-password" />
            <Button title="Simpan Data Diri" onPress={saveSelf} loading={selfBusy} testID="save-self" />
          </View>
        )}
      </Card>

      <Card>
        <Text style={s.cardTitle}>Tambah RCG Admin</Text>
        <Text style={s.selfHint}>Akun baru berperan RCG Admin dengan password awal BSI@2026.</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Field label="Nama Lengkap" value={addName} onChangeText={setAddName} placeholder="mis. BUDI SANTOSO" testID="rcg-add-nama" />
          <Field label="NIP" value={addNip} onChangeText={setAddNip} autoCapitalize="none" placeholder="mis. 2188001234" testID="rcg-add-nip" />
          <Button title="Tambah RCG Admin" icon="user-plus" onPress={addAdmin} loading={busy} testID="rcg-add-submit" />
        </View>
      </Card>

      <Text style={s.rcgListLabel}>Daftar Pengguna RCG ({rows.length})</Text>
      {rows.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={s.uName}>{r.nama}{r.is_self ? " (Anda)" : ""}</Text>
              <Text style={s.uMeta}>NIP {r.username}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <Badge label={r.role === "rcg_controller" ? "Full Controller" : "RCG Admin"} tone={r.role === "rcg_controller" ? "warning" : "brand"} />
                <Badge label={r.status === "active" ? "Aktif" : "Nonaktif"} tone={r.status === "active" ? "success" : "neutral"} />
              </View>
            </View>
          </View>
          {r.role !== "rcg_controller" && (
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}><Button title={r.status === "active" ? "Nonaktifkan" : "Aktifkan"} variant={r.status === "active" ? "outline" : "primary"} onPress={() => toggle(r)} testID={`rcg-toggle-${r.id}`} /></View>
              <View style={{ flex: 1 }}><Button title="Hapus" variant="danger" icon="trash-2" onPress={() => remove(r)} testID={`rcg-delete-${r.id}`} /></View>
            </View>
          )}
        </Card>
      ))}
      <View style={{ height: 8 }}>{isRefetching ? null : null}</View>
    </ScrollView>
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
function DeletedTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["deleted-assets"],
    queryFn: () => apiGet("/rcg/deleted-assets"),
  });

  const restore = async (a: any) => {
    const r = await confirm({ title: "Pulihkan Asset", message: `"${a.judul_asset}" akan dikembalikan dan tampil lagi di katalog publik.`, confirmText: "Pulihkan" });
    if (!r.ok) return;
    try {
      await apiPost(`/rcg/assets/${a.id}/restore`);
      toast("Asset dipulihkan", "success");
      qc.invalidateQueries({ queryKey: ["deleted-assets"] });
      qc.invalidateQueries();
    } catch (e: any) { toast(e.message, "error"); }
  };

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState onRetry={refetch} />;
  const rows: any[] = data || [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
      <Text style={s.selfHint}>Asset yang telah dihapus (disetujui ACRM). Anda dapat memulihkannya kembali beserta melihat alasan penghapusan.</Text>
      {rows.length === 0 ? (
        <EmptyState icon="trash-2" title="Belum ada asset terhapus" message="Semua asset masih aktif." />
      ) : rows.map((a) => (
        <Card key={a.id} testID={`deleted-asset-${a.id}`}>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Image source={{ uri: fileUrl(a.image) }} style={s.delThumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={s.uName} numberOfLines={2}>{a.judul_asset}</Text>
              <Text style={s.uMeta}>{a.nomor_asset}</Text>
              <Text style={s.uMeta}>{[a.kabupaten_kota, a.provinsi].filter(Boolean).join(", ")}</Text>
              <Text style={s.delPrice}>{rupiah(a.harga_limit)}</Text>
            </View>
          </View>
          <View style={s.delReasonBox}>
            <Text style={s.delReasonLabel}>Alasan penghapusan</Text>
            <Text style={s.delReasonTxt}>{a.delete_reason ? `"${a.delete_reason}"` : "-"}</Text>
            <Text style={s.delReqMeta}>Diajukan: {a.requested_by || "-"} • Disetujui: {a.approved_by || "-"} • {formatDateTime(a.deleted_at)}</Text>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button title="Pulihkan Asset" icon="rotate-ccw" onPress={() => restore(a)} testID={`restore-asset-${a.id}`} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function KategoriTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const controller = isController(user?.role);
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ["all-categories"], queryFn: () => apiGet("/master/categories?active_only=false") });
  const { data: delReqs } = useQuery({ queryKey: ["cat-delete-reqs"], queryFn: () => apiGet("/admin/category-delete-requests"), enabled: controller });

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

  const refreshCats = () => { qc.invalidateQueries({ queryKey: ["all-categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["public-filters"] }); qc.invalidateQueries({ queryKey: ["cat-delete-reqs"] }); };

  const toggle = async (cat: any) => {
    const activating = cat.status !== "active";
    const r = await confirm({
      title: activating ? "Aktifkan Kategori" : "Nonaktifkan Kategori",
      message: activating
        ? `"${cat.nama_category}" akan kembali muncul di katalog publik dan pilihan wizard.`
        : `"${cat.nama_category}" tidak akan muncul di katalog publik dan pilihan wizard. Asset yang sudah memakai kategori ini tetap tersimpan.`,
      confirmText: activating ? "Aktifkan" : "Nonaktifkan", tone: activating ? undefined : "danger",
    });
    if (!r.ok) return;
    try { await apiPost(`/admin/category/${cat.id}/toggle`); toast(activating ? "Kategori diaktifkan" : "Kategori dinonaktifkan", "success"); refreshCats(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const [renaming, setRenaming] = useState<any | null>(null);
  const [newName, setNewName] = useState("");
  const startRename = (cat: any) => { setRenaming(cat); setNewName(cat.nama_category); };
  const saveRename = async () => {
    if (!newName.trim()) { toast("Nama kategori wajib diisi", "error"); return; }
    setBusy(true);
    try {
      await apiPut(`/admin/category/${renaming.id}`, { nama_category: newName.trim(), parent_category_id: renaming.parent_category_id || null });
      toast("Nama kategori diperbarui", "success");
      setRenaming(null); refreshCats();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  // Delete category (controller = direct; admin = request awaiting controller approval). Reason mandatory.
  const [deleting, setDeleting] = useState<any | null>(null);
  const [delReason, setDelReason] = useState("");
  const startDelete = (cat: any) => { setDeleting(cat); setDelReason(""); };
  const saveDelete = async () => {
    if (!delReason.trim()) { toast("Alasan penghapusan wajib diisi", "error"); return; }
    setBusy(true);
    try {
      const r = await apiDelete(`/admin/category/${deleting.id}`, { reason: delReason.trim() });
      toast(r.pending ? "Permintaan hapus dikirim ke RCG Full Controller" : "Kategori dihapus", "success");
      setDeleting(null); refreshCats();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  const approveDel = async (cat: any) => {
    const r = await confirm({ title: "Setujui Hapus Kategori", message: `Hapus kategori "${cat.nama_category}" secara permanen dari daftar?`, confirmText: "Setujui Hapus", tone: "danger" });
    if (!r.ok) return;
    try { await apiPost(`/admin/category/${cat.id}/approve-delete`); toast("Kategori dihapus", "success"); refreshCats(); }
    catch (e: any) { toast(e.message, "error"); }
  };
  const rejectDel = async (cat: any) => {
    const r = await confirm({ title: "Tolak Hapus Kategori", confirmText: "Tolak", requireNote: true, noteLabel: "Alasan penolakan (opsional)", notePlaceholder: "Alasan menolak..." });
    if (!r.ok) return;
    try { await apiPost(`/admin/category/${cat.id}/reject-delete`, { notes: r.note || null }); toast("Permintaan hapus ditolak", "success"); refreshCats(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  const parents = data || [];

  const CatActions = ({ cat }: { cat: any }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      {cat.pending_delete ? <Badge label="Menunggu Hapus" tone="warning" /> : null}
      <Pressable onPress={() => startRename(cat)} hitSlop={8} style={s.iconBtn} testID={`rename-cat-${cat.id}`}>
        <Icon name="edit-2" size={15} color={colors.brandPrimary} />
      </Pressable>
      <Pressable onPress={() => toggle(cat)} testID={`toggle-cat-${cat.id}`}>
        <Badge label={cat.status === "active" ? "Aktif" : "Nonaktif"} tone={cat.status === "active" ? "success" : "neutral"} />
      </Pressable>
      {!cat.pending_delete && (
        <Pressable onPress={() => startDelete(cat)} hitSlop={8} style={s.iconBtn} testID={`delete-cat-${cat.id}`}>
          <Icon name="trash-2" size={15} color={colors.error} />
        </Pressable>
      )}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }}
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

      {controller && (delReqs || []).length > 0 && (
        <Card testID="cat-delete-requests">
          <Text style={s.cardTitle}>Permintaan Hapus Kategori ({(delReqs || []).length})</Text>
          <Text style={s.selfHint}>Diajukan RCG Admin, menunggu persetujuan Anda sebagai Full Controller.</Text>
          {(delReqs || []).map((c: any) => (
            <View key={c.id} style={s.delReqRow}>
              <Text style={s.catName}>{c.nama_category}</Text>
              <Text style={s.delReqMeta}>Oleh: {c.delete_requested_by}</Text>
              <Text style={s.delReqReason}>{`"${c.delete_reason}"`}</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}><Button title="Tolak" variant="outline" onPress={() => rejectDel(c)} testID={`cat-reject-del-${c.id}`} /></View>
                <View style={{ flex: 1 }}><Button title="Setujui Hapus" variant="danger" icon="trash-2" onPress={() => approveDel(c)} testID={`cat-approve-del-${c.id}`} /></View>
              </View>
            </View>
          ))}
        </Card>
      )}

      {isLoading ? <Loading /> : parents.map((p: any) => (
        <Card key={p.id}>
          <View style={s.catHead}>
            <Text style={[s.catName, p.status !== "active" && { color: colors.muted }]}>{p.nama_category}</Text>
            <CatActions cat={p} />
          </View>
          {(p.subcategories || []).map((sub: any) => (
            <View key={sub.id} style={s.subRow}>
              <Text style={[s.subName, sub.status !== "active" && { color: colors.muted, textDecorationLine: "line-through" }]}>• {sub.nama_category}</Text>
              <CatActions cat={sub} />
            </View>
          ))}
        </Card>
      ))}

      <Modal visible={!!renaming} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <Pressable style={s.renameBackdrop} onPress={() => setRenaming(null)}>
          <Pressable style={s.renameCard} onPress={() => {}}>
            <Text style={s.cardTitle}>Ubah Nama Kategori</Text>
            <Text style={s.modalHint}>{renaming?.parent_category_id ? "Subkategori" : "Kategori utama"} • nama lama: {renaming?.nama_category}</Text>
            <Field label="Nama Baru" value={newName} onChangeText={setNewName} testID="rename-category-input" />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              <View style={{ flex: 1 }}><Button title="Batal" variant="outline" onPress={() => setRenaming(null)} testID="rename-cancel" /></View>
              <View style={{ flex: 1 }}><Button title="Simpan" onPress={saveRename} loading={busy} testID="rename-save" /></View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!deleting} transparent animationType="fade" onRequestClose={() => setDeleting(null)}>
        <Pressable style={s.renameBackdrop} onPress={() => setDeleting(null)}>
          <Pressable style={s.renameCard} onPress={() => {}}>
            <Text style={s.cardTitle}>Hapus Kategori</Text>
            <Text style={s.modalHint}>
              {controller
                ? `"${deleting?.nama_category}" akan dihapus permanen. Wajib isi alasan.`
                : `Permintaan hapus "${deleting?.nama_category}" akan dikirim ke RCG Full Controller untuk disetujui. Wajib isi alasan.`}
            </Text>
            <Field label="Alasan Penghapusan (wajib)" value={delReason} onChangeText={setDelReason} placeholder="Mis. kategori dobel / tidak dipakai lagi" testID="delete-category-reason" />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              <View style={{ flex: 1 }}><Button title="Batal" variant="outline" onPress={() => setDeleting(null)} testID="delete-cancel" /></View>
              <View style={{ flex: 1 }}><Button title={controller ? "Hapus" : "Ajukan Hapus"} variant="danger" onPress={saveDelete} loading={busy} testID="delete-save" /></View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// -------- Audit --------
function LaporanTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data: dash } = useQuery({ queryKey: ["dash-rcg"], queryFn: () => apiGet("/dashboard/rcg") });

  const exportExcel = async () => {
    setBusy(true);
    try {
      const r = await apiGet("/rcg/reports/assets/link");
      await Linking.openURL(fileUrl(r.url) as string);
      toast("Laporan Excel sedang diunduh", "success");
    } catch (e: any) {
      toast(e.message || "Gagal membuat laporan", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={s.reportIcon}><Icon name="file-text" size={22} color={colors.brandPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.reportTitle}>Laporan Asset (Excel)</Text>
            <Text style={s.reportSub}>Rekap bulanan seluruh asset per ACR dan per status, lengkap dengan detail tiap asset.</Text>
          </View>
        </View>
        <View style={s.reportList}>
          {["Sheet 1 — Ringkasan per ACR × status + total nilai harga limit", "Sheet 2 — Detail seluruh asset (lokasi, harga, jadwal lelang, PIC)", "Sheet 3 — Ringkasan per status"].map((t) => (
            <View key={t} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Icon name="check" size={14} color={colors.success} style={{ marginTop: 2 }} />
              <Text style={s.reportItem}>{t}</Text>
            </View>
          ))}
        </View>
        {dash?.totals?.asset != null && <Text style={s.reportMeta}>{dash.totals.asset} asset akan disertakan • tautan unduh berlaku 10 menit</Text>}
        <Button title="Unduh Laporan Excel" icon="download" onPress={exportExcel} loading={busy} testID="export-excel-button" />
      </Card>
    </ScrollView>
  );
}

function AuditTab() {
  const s = useStyles();
  const { colors } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: ["audit"], queryFn: () => apiGet("/admin/audit-logs?limit=100") });

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState onRetry={refetch} />;
  return (
    <FlatList
      style={{ flex: 1 }}
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
  pubBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, height: 32, borderRadius: 16 },
  pubBtnTxt: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  tabScroll: { flexGrow: 0, flexShrink: 0, height: 50, backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
  tabRow: { flexDirection: "row", alignItems: "center" },
  tab: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", height: 49, paddingHorizontal: spacing.lg, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: c.brandPrimary },
  tabTxt: { fontSize: 13, fontWeight: "700", color: c.muted },
  ctrlBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.brandSecondary, alignItems: "center", justifyContent: "center" },
  selfHint: { fontSize: 12, color: c.muted, marginTop: 4, lineHeight: 17 },
  rcgListLabel: { fontSize: 14, fontWeight: "800", color: c.onSurface, marginTop: spacing.sm },
  delReqRow: { borderTopWidth: 1, borderTopColor: c.divider, paddingTop: spacing.md, marginTop: spacing.md, gap: 2 },
  delReqMeta: { fontSize: 12, color: c.muted },
  delReqReason: { fontSize: 13, color: c.onSurfaceSecondary, fontStyle: "italic", marginTop: 2 },
  delThumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  delPrice: { fontSize: 15, fontWeight: "900", color: c.brandPrimary, marginTop: 2 },
  delReasonBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, gap: 2 },
  delReasonLabel: { fontSize: 12, fontWeight: "800", color: c.error },
  delReasonTxt: { fontSize: 13, color: "#7F1D1D", lineHeight: 19 },
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
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  renameBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  renameCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  modalHint: { fontSize: 12, color: c.muted, marginTop: -8 },
  reportIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  reportTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  reportSub: { fontSize: 12, color: c.muted, marginTop: 2, lineHeight: 17 },
  reportList: { gap: 6, marginTop: spacing.md, marginBottom: spacing.md },
  reportItem: { fontSize: 13, color: c.onSurfaceSecondary, flex: 1 },
  reportMeta: { fontSize: 12, color: c.muted, marginBottom: spacing.sm },
  auditRow: { flexDirection: "row", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brandPrimary, marginTop: 5 },
  auditAction: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  auditMeta: { fontSize: 12, color: c.onSurfaceSecondary },
  auditTime: { fontSize: 11, color: c.muted, marginTop: 1 },
  auditNote: { fontSize: 12, color: c.onSurfaceSecondary, fontStyle: "italic", marginTop: 2 },
}));
