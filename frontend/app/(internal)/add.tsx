import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { makeStyles, useTheme } from "@/src/theme";
import { apiGet, apiPost, apiPut, apiForm, fileUrl } from "@/src/api";
import { useAuth } from "@/src/auth";
import { rupiah } from "@/src/format";
import { ScreenHeader, Field, Select, Button, Icon, Loading, spacing, radius } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useConfirm } from "@/src/components/confirm";

const KONDISI = ["Baik", "Cukup", "Rusak Ringan", "Rusak Berat"];
const STEPS = ["Info Dasar", "Lokasi", "Detail", "Foto", "Jadwal", "Review"];

type FormState = {
  id_category: string | null; id_subcategory: string | null; judul_asset: string; deskripsi: string;
  provinsi: string; kabupaten_kota: string; kecamatan: string; wilayah_level_4: string; tipe_wilayah: string; alamat: string;
  luas_tanah: string; luas_bangunan: string; kondisi_asset: string | null; nilai_appraisal: string; harga_limit: string;
  extra: Record<string, string>;
};

const EMPTY: FormState = {
  id_category: null, id_subcategory: null, judul_asset: "", deskripsi: "",
  provinsi: "", kabupaten_kota: "", kecamatan: "", wilayah_level_4: "", tipe_wilayah: "Kelurahan", alamat: "",
  luas_tanah: "", luas_bangunan: "", kondisi_asset: null, nilai_appraisal: "", harga_limit: "", extra: {},
};

export default function AddAsset() {
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editId = params.edit;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSchedule, setHasSchedule] = useState(false);
  const [tanggal, setTanggal] = useState("");
  const [kpknlId, setKpknlId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { data: ctx } = useQuery({ queryKey: ["ma-context"], queryFn: () => apiGet("/marketing/context") });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => apiGet("/master/categories") });
  const { data: kpknl } = useQuery({ queryKey: ["kpknl"], queryFn: () => apiGet("/master/kpknl") });

  // Reset when entering fresh (no edit)
  useFocusEffect(
    React.useCallback(() => {
      if (!editId) {
        setForm(EMPTY); setAssetId(null); setImages([]); setStep(0);
        setHasSchedule(false); setTanggal(""); setKpknlId(null); setErrors({});
        setReady(true);
      }
      return () => {};
    }, [editId])
  );

  // Load edit data
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const a = await apiGet(`/assets/${editId}`);
        setAssetId(a.id);
        setForm({
          id_category: a.id_category, id_subcategory: a.id_subcategory || null,
          judul_asset: a.judul_asset || "", deskripsi: a.deskripsi || "",
          provinsi: a.provinsi || "", kabupaten_kota: a.kabupaten_kota || "", kecamatan: a.kecamatan || "",
          wilayah_level_4: a.wilayah_level_4 || "", tipe_wilayah: a.tipe_wilayah || "Kelurahan", alamat: a.alamat || "",
          luas_tanah: a.luas_tanah != null ? String(a.luas_tanah) : "", luas_bangunan: a.luas_bangunan != null ? String(a.luas_bangunan) : "",
          kondisi_asset: a.kondisi_asset || null, nilai_appraisal: a.nilai_appraisal != null ? String(a.nilai_appraisal) : "",
          harga_limit: a.harga_limit != null ? String(a.harga_limit) : "", extra: a.extra || {},
        });
        setImages(a.images || []);
        if (a.tanggal_lelang) { setHasSchedule(true); setTanggal(a.tanggal_lelang); setKpknlId(a.schedule_kpknl_id || null); }
        setStep(0);
        setReady(true);
      } catch (e: any) {
        toast(e.message || "Gagal memuat asset", "error");
        router.back();
      }
    })();
  }, [editId]);

  const set = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const parentCats = categories || [];
  const subCats = useMemo(() => {
    const p = parentCats.find((c: any) => c.id === form.id_category);
    return p?.subcategories || [];
  }, [parentCats, form.id_category]);

  const catName = parentCats.find((c: any) => c.id === form.id_category)?.nama_category || "";
  const isVehicle = catName.startsWith("KENDARAAN");
  const isTanahKosong = subCats.find((c: any) => c.id === form.id_subcategory)?.nama_category === "Tanah Kosong";

  const validateStep = (st: number): boolean => {
    const e: Record<string, string> = {};
    if (st === 0) {
      if (!form.id_category) e.id_category = "Kategori wajib dipilih";
      if (subCats.length && !form.id_subcategory) e.id_subcategory = "Subkategori wajib dipilih";
      if (!form.judul_asset.trim()) e.judul_asset = "Judul wajib diisi";
      if (!form.deskripsi.trim()) e.deskripsi = "Deskripsi wajib diisi";
    }
    if (st === 1) {
      if (!form.provinsi.trim()) e.provinsi = "Provinsi wajib diisi";
      if (!form.kabupaten_kota.trim()) e.kabupaten_kota = "Kabupaten/Kota wajib diisi";
      if (!form.kecamatan.trim()) e.kecamatan = "Kecamatan wajib diisi";
      if (!form.wilayah_level_4.trim()) e.wilayah_level_4 = "Kelurahan/Desa wajib diisi";
      if (!form.alamat.trim()) e.alamat = "Alamat wajib diisi";
    }
    if (st === 2) {
      if (!isVehicle) {
        if (!form.luas_tanah || Number(form.luas_tanah) <= 0) e.luas_tanah = "Luas tanah harus > 0";
        if (!isTanahKosong && catName === "PROPERTI" && (!form.luas_bangunan || Number(form.luas_bangunan) <= 0)) e.luas_bangunan = "Luas bangunan harus > 0";
      }
      if (!form.harga_limit || Number(form.harga_limit) <= 0) e.harga_limit = "Harga limit harus > 0";
      if (!form.kondisi_asset) e.kondisi_asset = "Kondisi wajib dipilih";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    judul_asset: form.judul_asset.trim(), deskripsi: form.deskripsi.trim(),
    id_category: form.id_category, id_subcategory: form.id_subcategory,
    alamat: form.alamat.trim(), provinsi: form.provinsi.trim(), kabupaten_kota: form.kabupaten_kota.trim(),
    kecamatan: form.kecamatan.trim(), wilayah_level_4: form.wilayah_level_4.trim(), tipe_wilayah: form.tipe_wilayah,
    luas_tanah: form.luas_tanah ? Number(form.luas_tanah) : null,
    luas_bangunan: form.luas_bangunan ? Number(form.luas_bangunan) : null,
    kondisi_asset: form.kondisi_asset, nilai_appraisal: form.nilai_appraisal ? Number(form.nilai_appraisal) : null,
    harga_limit: form.harga_limit ? Number(form.harga_limit) : null, extra: form.extra,
  });

  // Save draft (create or update) -> ensures assetId exists
  const ensureSaved = async (): Promise<string | null> => {
    setBusy(true);
    try {
      const payload = buildPayload();
      if (assetId) {
        await apiPut(`/assets/${assetId}`, payload);
        return assetId;
      } else {
        const created = await apiPost("/assets", payload);
        setAssetId(created.id);
        return created.id;
      }
    } catch (e: any) {
      toast(e.message || "Gagal menyimpan", "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!validateStep(step)) { toast("Lengkapi data yang wajib diisi", "error"); return; }
    if (step === 2) { const id = await ensureSaved(); if (!id) return; }
    setStep((x) => Math.min(x + 1, STEPS.length - 1));
  };
  const back = () => setStep((x) => Math.max(x - 1, 0));

  const pickImage = async () => {
    if (!assetId) { toast("Simpan data dulu", "error"); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast("Izin galeri ditolak", "error"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (res.canceled) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      const form2 = new FormData();
      const name = `photo-${Date.now()}.jpg`;
      if (Platform.OS === "web") {
        const blob = await (await fetch(asset.uri)).blob();
        form2.append("file", blob, name);
      } else {
        form2.append("file", { uri: asset.uri, name, type: "image/jpeg" } as any);
      }
      form2.append("jenis", images.length === 0 ? "utama" : "tambahan");
      const img = await apiForm(`/assets/${assetId}/images`, form2);
      setImages((x) => [...x, img.url]);
      toast("Foto berhasil diupload", "success");
    } catch (e: any) {
      toast(e.message || "Upload gagal", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async (): Promise<boolean> => {
    if (!hasSchedule) return true;
    if (!tanggal || !kpknlId) { toast("Lengkapi tanggal & KPKNL", "error"); return false; }
    try {
      const f = new FormData();
      f.append("tanggal_lelang", tanggal);
      f.append("id_kpknl", kpknlId);
      await apiForm(`/assets/${assetId}/schedule`, f);
      return true;
    } catch (e: any) {
      toast(e.message || "Gagal simpan jadwal", "error");
      return false;
    }
  };

  const finalSubmit = async () => {
    const r = await confirm({ title: "Submit Asset", message: "Asset akan dikirim ke ACRM untuk direview. Data tidak dapat diubah selama proses review.", confirmText: "Submit" });
    if (!r.ok) return;
    setBusy(true);
    try {
      await apiPut(`/assets/${assetId}`, buildPayload());
      const okSched = await saveSchedule();
      if (!okSched) { setBusy(false); return; }
      await apiPost(`/assets/${assetId}/submit`);
      qc.invalidateQueries();
      toast("Asset berhasil disubmit", "success");
      router.replace("/queue");
    } catch (e: any) {
      toast(e.message || "Gagal submit", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveDraftAndExit = async () => {
    if (!validateStep(0)) { toast("Lengkapi Info Dasar dulu", "error"); return; }
    const id = await ensureSaved();
    if (id) { qc.invalidateQueries(); toast("Draft disimpan", "success"); router.replace("/queue"); }
  };

  if (!ready) return <View style={s.screen}><View style={{ paddingTop: insets.top }}><ScreenHeader title="Tambah Asset" /></View><Loading /></View>;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={editId ? "Edit Asset" : "Tambah Asset"} onBack={() => router.back()} />

      {/* Progress */}
      <View style={s.progressWrap}>
        {STEPS.map((label, i) => (
          <View key={label} style={{ flex: 1, alignItems: "center" }}>
            <View style={[s.stepDot, i <= step && s.stepDotActive]}>
              {i < step ? <Icon name="check" size={12} color="#FFF" /> : <Text style={[s.stepNum, i <= step && { color: "#FFF" }]}>{i + 1}</Text>}
            </View>
            <Text style={[s.stepLabel, i === step && { color: colors.brandPrimary, fontWeight: "800" }]} numberOfLines={1}>{label}</Text>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {/* Auto-filled context */}
          {step === 0 && ctx && (
            <View style={s.ctxBox}>
              <Text style={s.ctxTitle}>Terisi otomatis</Text>
              <Text style={s.ctxLine}>ACR: {ctx.nama_acr}</Text>
              <Text style={s.ctxLine}>ACRM: {ctx.nama_acrm}</Text>
              <Text style={s.ctxLine}>Marketing: {ctx.nama_marketing_asset} • {ctx.nomor_hp}</Text>
            </View>
          )}

          {step === 0 && (
            <>
              <Select label="Kategori Asset" required testID="select-category" value={form.id_category}
                options={parentCats.map((c: any) => ({ value: c.id, label: c.nama_category }))}
                onChange={(v) => { set("id_category", v); set("id_subcategory", null); }} />
              {errors.id_category && <Text style={s.err}>{errors.id_category}</Text>}
              {subCats.length > 0 && (
                <>
                  <Select label="Subkategori" required testID="select-subcategory" value={form.id_subcategory}
                    options={subCats.map((c: any) => ({ value: c.id, label: c.nama_category }))}
                    onChange={(v) => set("id_subcategory", v)} />
                  {errors.id_subcategory && <Text style={s.err}>{errors.id_subcategory}</Text>}
                </>
              )}
              <Field label="Nama / Judul Asset" required value={form.judul_asset} onChangeText={(t) => set("judul_asset", t)} placeholder="mis. Rumah 2 Lantai Siap Huni" error={errors.judul_asset} testID="field-judul" />
              <Field label="Deskripsi" required multiline value={form.deskripsi} onChangeText={(t) => set("deskripsi", t)} placeholder="Deskripsikan kondisi & keunggulan asset" error={errors.deskripsi} testID="field-deskripsi" />
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Provinsi" required value={form.provinsi} onChangeText={(t) => set("provinsi", t)} error={errors.provinsi} testID="field-provinsi" />
              <Field label="Kabupaten / Kota" required value={form.kabupaten_kota} onChangeText={(t) => set("kabupaten_kota", t)} error={errors.kabupaten_kota} testID="field-kabkota" />
              <Field label="Kecamatan" required value={form.kecamatan} onChangeText={(t) => set("kecamatan", t)} error={errors.kecamatan} testID="field-kecamatan" />
              <Select label="Tipe Wilayah Terendah" value={form.tipe_wilayah}
                options={["Kelurahan", "Desa", "Nagari"].map((v) => ({ value: v, label: v }))}
                onChange={(v) => set("tipe_wilayah", v)} />
              <Field label={`${form.tipe_wilayah}`} required value={form.wilayah_level_4} onChangeText={(t) => set("wilayah_level_4", t)} error={errors.wilayah_level_4} testID="field-kelurahan" />
              <Field label="Alamat Lengkap" required multiline value={form.alamat} onChangeText={(t) => set("alamat", t)} error={errors.alamat} testID="field-alamat" />
            </>
          )}

          {step === 2 && (
            <>
              {!isVehicle && (
                <>
                  <Field label="Luas Tanah (m²)" required value={form.luas_tanah} onChangeText={(t) => set("luas_tanah", t)} keyboardType="numeric" error={errors.luas_tanah} testID="field-luastanah" />
                  {!isTanahKosong && (
                    <Field label="Luas Bangunan (m²)" value={form.luas_bangunan} onChangeText={(t) => set("luas_bangunan", t)} keyboardType="numeric" error={errors.luas_bangunan} testID="field-luasbangunan" />
                  )}
                </>
              )}
              {isVehicle && (
                <>
                  <Field label="Merek" value={form.extra.merek || ""} onChangeText={(t) => set("extra", { ...form.extra, merek: t })} testID="field-merek" />
                  <Field label="Model / Tipe" value={form.extra.model || ""} onChangeText={(t) => set("extra", { ...form.extra, model: t })} testID="field-model" />
                  <Field label="Tahun" value={form.extra.tahun || ""} onChangeText={(t) => set("extra", { ...form.extra, tahun: t })} keyboardType="numeric" testID="field-tahun" />
                  <Field label="Warna" value={form.extra.warna || ""} onChangeText={(t) => set("extra", { ...form.extra, warna: t })} testID="field-warna" />
                </>
              )}
              <Select label="Kondisi Asset" required testID="select-kondisi" value={form.kondisi_asset}
                options={KONDISI.map((k) => ({ value: k, label: k }))} onChange={(v) => set("kondisi_asset", v)} />
              {errors.kondisi_asset && <Text style={s.err}>{errors.kondisi_asset}</Text>}
              <Field label="Nilai Appraisal (Rp)" value={form.nilai_appraisal} onChangeText={(t) => set("nilai_appraisal", t)} keyboardType="numeric" testID="field-appraisal" />
              <Field label="Harga Limit (Rp)" required value={form.harga_limit} onChangeText={(t) => set("harga_limit", t)} keyboardType="numeric" error={errors.harga_limit} testID="field-harga" />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={s.sectionTitle}>Foto Asset</Text>
              <Text style={s.hint}>Foto pertama menjadi foto utama katalog. Format JPG/PNG, maks 10MB.</Text>
              <View style={s.imgGrid}>
                {images.map((u, i) => (
                  <View key={i} style={s.imgWrap}>
                    <Image source={{ uri: fileUrl(u) }} style={s.img} contentFit="cover" />
                    {i === 0 && <View style={s.utamaBadge}><Text style={s.utamaTxt}>Utama</Text></View>}
                  </View>
                ))}
                <Pressable style={s.addImg} onPress={pickImage} testID="add-photo-button">
                  <Icon name="camera" size={24} color={colors.brandPrimary} />
                  <Text style={s.addImgTxt}>Tambah Foto</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={s.sectionTitle}>Jadwal Lelang (Opsional)</Text>
              <Pressable style={s.toggle} onPress={() => setHasSchedule(!hasSchedule)} testID="toggle-schedule">
                <View style={[s.checkbox, hasSchedule && s.checkboxOn]}>{hasSchedule && <Icon name="check" size={14} color="#FFF" />}</View>
                <Text style={s.toggleTxt}>Sudah ada jadwal lelang dari KPKNL</Text>
              </Pressable>
              {hasSchedule && (
                <>
                  <Field label="Tanggal Lelang (YYYY-MM-DD)" value={tanggal} onChangeText={setTanggal} placeholder="2026-07-15" testID="field-tanggal" />
                  <Select label="KPKNL" required testID="select-kpknl" value={kpknlId}
                    options={(kpknl || []).map((k: any) => ({ value: k.id, label: k.nama_kpknl }))}
                    onChange={(v) => setKpknlId(v)} />
                  {kpknlId && (
                    <View style={s.kpknlBox}>
                      <Text style={s.kpknlName}>{(kpknl || []).find((k: any) => k.id === kpknlId)?.nama_kpknl}</Text>
                      <Text style={s.kpknlAddr}>{(kpknl || []).find((k: any) => k.id === kpknlId)?.alamat_kpknl}</Text>
                    </View>
                  )}
                </>
              )}
              {!hasSchedule && <Text style={s.hint}>Jadwal dapat ditambahkan nanti setelah asset dipublikasikan.</Text>}
            </>
          )}

          {step === 5 && (
            <>
              <Text style={s.sectionTitle}>Review & Submit</Text>
              <View style={s.reviewCard}>
                <ReviewRow label="Judul" value={form.judul_asset} />
                <ReviewRow label="Kategori" value={catName + (subCats.find((c: any) => c.id === form.id_subcategory)?.nama_category ? " • " + subCats.find((c: any) => c.id === form.id_subcategory)?.nama_category : "")} />
                <ReviewRow label="Lokasi" value={[form.wilayah_level_4, form.kecamatan, form.kabupaten_kota, form.provinsi].filter(Boolean).join(", ")} />
                <ReviewRow label="Harga Limit" value={rupiah(Number(form.harga_limit))} />
                <ReviewRow label="Foto" value={`${images.length} foto`} />
                <ReviewRow label="Jadwal Lelang" value={hasSchedule ? tanggal : "Belum ada"} />
              </View>
              <View style={s.infoBanner}>
                <Icon name="info" size={16} color={colors.info} />
                <Text style={s.infoBannerTxt}>Setelah submit, asset akan direview ACRM lalu disetujui Admin RCG sebelum tampil di katalog publik.</Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {step > 0 && <View style={{ flex: 1 }}><Button title="Kembali" variant="outline" onPress={back} testID="wizard-back" /></View>}
        {step === 0 && <View style={{ flex: 1 }}><Button title="Simpan Draft" variant="outline" onPress={saveDraftAndExit} loading={busy} testID="save-draft" /></View>}
        <View style={{ flex: 1.4 }}>
          {step < STEPS.length - 1
            ? <Button title="Lanjut" icon="arrow-right" onPress={next} loading={busy} testID="wizard-next" />
            : <Button title="Submit Asset" icon="send" onPress={finalSubmit} loading={busy} testID="wizard-submit" />}
        </View>
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  const s = useStyles();
  return (
    <View style={s.reviewRow}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={s.reviewValue}>{value || "-"}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  progressWrap: { flexDirection: "row", backgroundColor: c.surfaceSecondary, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: c.brandPrimary },
  stepNum: { fontSize: 12, fontWeight: "800", color: c.muted },
  stepLabel: { fontSize: 9, color: c.muted, marginTop: 4 },
  ctxBox: { backgroundColor: c.brandTertiary, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  ctxTitle: { fontSize: 12, fontWeight: "800", color: c.onBrandTertiary, marginBottom: 2 },
  ctxLine: { fontSize: 13, color: c.onBrandTertiary },
  err: { fontSize: 12, color: c.error, marginTop: -6 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  hint: { fontSize: 13, color: c.muted },
  imgGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  imgWrap: { width: 100, height: 100, borderRadius: radius.md, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  img: { width: "100%", height: "100%" },
  utamaBadge: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.brandPrimary, paddingVertical: 2, alignItems: "center" },
  utamaTxt: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  addImg: { width: 100, height: 100, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.brandPrimary, alignItems: "center", justifyContent: "center", gap: 4 },
  addImgTxt: { fontSize: 11, color: c.brandPrimary, fontWeight: "700" },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  toggleTxt: { fontSize: 14, color: c.onSurface, flex: 1 },
  kpknlBox: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  kpknlName: { fontSize: 13, fontWeight: "800", color: c.onSurface },
  kpknlAddr: { fontSize: 12, color: c.muted, lineHeight: 17 },
  reviewCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.md },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.divider },
  reviewLabel: { fontSize: 13, color: c.muted },
  reviewValue: { fontSize: 13, color: c.onSurface, fontWeight: "700", flex: 1, textAlign: "right" },
  infoBanner: { flexDirection: "row", gap: 8, backgroundColor: "#EFF6FF", borderRadius: radius.md, padding: spacing.md },
  infoBannerTxt: { flex: 1, fontSize: 12, color: c.info, lineHeight: 18 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
}));
