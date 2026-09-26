import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { apiPost } from "@/src/api";
import { ScreenHeader, Card, Field, Button, Icon, Badge, spacing, radius } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { useConfirm } from "@/src/components/confirm";

const ROLE_LABEL: Record<string, string> = { marketing_asset: "Marketing Asset (Maker)", acrm: "ACRM (Checker)", admin_rcg: "Admin RCG (Controller)" };

export default function Account() {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [showPw, setShowPw] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  const changePw = async () => {
    if (!oldPw || !newPw) { toast("Isi password lama & baru", "error"); return; }
    setBusy(true);
    try {
      await apiPost("/auth/change-password", { old_password: oldPw, new_password: newPw });
      toast("Password berhasil diubah", "success");
      setOldPw(""); setNewPw(""); setShowPw(false);
    } catch (e: any) {
      toast(e.message || "Gagal ubah password", "error");
    } finally {
      setBusy(false);
    }
  };

  const doLogout = async () => {
    const r = await confirm({ title: "Keluar", message: "Anda yakin ingin keluar dari akun?", confirmText: "Keluar", tone: "danger" });
    if (!r.ok) return;
    await logout();
    router.replace("/");
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Akun Saya" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }}>
        <Card>
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <View style={s.avatar}><Icon name="user" size={30} color={colors.brandPrimary} /></View>
            <Text style={s.name}>{user?.nama || user?.username}</Text>
            <Badge label={ROLE_LABEL[user?.role || ""] || ""} tone="brand" />
          </View>
          <View style={{ marginTop: spacing.md, gap: 4 }}>
            <Row label="Username / NIP" value={user?.username} />
            {user?.acr && <Row label="ACR" value={user.acr.nama} />}
            {user?.acrm && user?.role === "marketing_asset" && <Row label="ACRM" value={user.acrm.nama} />}
            {user?.ma && <Row label="No. HP" value={user.ma.hp} />}
          </View>
        </Card>

        {user?.data_flag === "PERLU_KONFIRMASI_DATA" && (
          <View style={s.warnBox}>
            <Icon name="alert-triangle" size={16} color={colors.warning} />
            <Text style={s.warnTxt}>Data profil Anda ditandai perlu konfirmasi. Hubungi Admin RCG untuk pembaruan.</Text>
          </View>
        )}

        <Card>
          <Text style={s.cardTitle}>Navigasi</Text>
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title="Buka Katalog Publik (Halaman Utama)"
              variant="outline"
              icon="grid"
              onPress={() => router.push("/")}
              testID="account-open-public-catalog"
            />
          </View>
        </Card>

        <Card>
          <Pressable style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} onPress={() => setShowPw(!showPw)} testID="toggle-change-password">
            <Text style={s.cardTitle}>Ubah Password</Text>
            <Icon name={showPw ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
          </Pressable>
          {showPw ? (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <Field label="Password Lama" value={oldPw} onChangeText={setOldPw} secureTextEntry autoCapitalize="none" testID="old-password" />
              <Field label="Password Baru" value={newPw} onChangeText={setNewPw} secureTextEntry autoCapitalize="none" testID="new-password" />
              <Button title="Simpan Password" onPress={changePw} loading={busy} testID="save-password" />
            </View>
          ) : (
            <Button title="Ubah Password" variant="outline" onPress={() => setShowPw(true)} testID="open-change-password" />
          )}
        </Card>

        <Button title="Keluar" variant="danger" icon="log-out" onPress={doLogout} testID="logout-button" />
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  const s = useStyles();
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value || "-"}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  cardTitle: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: c.divider },
  rowLabel: { fontSize: 13, color: c.muted },
  rowValue: { fontSize: 13, color: c.onSurface, fontWeight: "600" },
  warnBox: { flexDirection: "row", gap: 8, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.md, padding: spacing.md },
  warnTxt: { flex: 1, fontSize: 12, color: c.warning, lineHeight: 18 },
}));
