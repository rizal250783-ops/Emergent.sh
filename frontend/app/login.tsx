import React, { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { Icon, Field, Button, spacing, radius } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const { login } = useAuth();
  const toast = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("NIP/username dan password wajib diisi");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast("Berhasil masuk", "success");
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e.message || "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <Pressable style={s.back} onPress={() => router.replace("/")} testID="login-back">
        <Icon name="arrow-left" size={22} color={colors.onSurface} />
      </Pressable>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.logoBox}>
            <Image source={require("../assets/images/bsi-logo.png")} style={s.logoImg} contentFit="contain" />
          </View>
          <Text style={s.appName}>BSI ASSET DEAL</Text>
          <Text style={s.tagline}>Menghubungkan Investor dengan Asset BSI</Text>
          <Text style={s.org}>PT. Bank Syariah Indonesia, Tbk</Text>
          <Text style={s.orgSub}>Retail Collection, Restructuring & Recovery Group (RCG)</Text>

          <View style={s.form}>
            <Field
              label="NIP / Username"
              value={username}
              onChangeText={(t) => { setUsername(t); setError(""); }}
              placeholder="Masukkan NIP Anda"
              autoCapitalize="none"
              testID="login-username"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              placeholder="Masukkan password"
              autoCapitalize="none"
              secureTextEntry={!showPw}
              rightIcon={showPw ? "eye-off" : "eye"}
              onRightPress={() => setShowPw(!showPw)}
              testID="login-password"
            />
            {error ? (
              <View style={s.errBox} testID="login-error">
                <Icon name="alert-circle" size={16} color={colors.error} />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            ) : null}
            <Button title="Masuk" onPress={submit} loading={loading} testID="login-submit" />
            <Button
              title="Kembali ke Katalog Publik"
              variant="outline"
              icon="arrow-left"
              onPress={() => router.replace("/")}
              testID="login-back-button"
            />
            <Text style={s.hint}>Gunakan NIP dan password yang diberikan Admin RCG.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surfaceSecondary },
  back: { position: "absolute", left: spacing.lg, top: spacing.xl, zIndex: 2, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  logoBox: { paddingVertical: spacing.sm },
  logoImg: { width: 220, height: 62 },
  appName: { fontSize: 24, fontWeight: "900", color: c.onSurface, marginTop: spacing.lg, letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: c.onSurface, fontStyle: "italic", marginTop: 4 },
  org: { fontSize: 13, color: c.onSurface, fontWeight: "700", marginTop: spacing.md },
  orgSub: { fontSize: 12, color: c.muted, textAlign: "center", marginTop: 2 },
  form: { width: "100%", marginTop: spacing.xl, gap: spacing.md },
  pwLabel: { fontSize: 13, fontWeight: "600", color: c.onSurface },
  pwWrap: { position: "relative" },
  eye: { position: "absolute", right: 0, top: 0, bottom: 0, width: 48 },
  errBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEE2E2", padding: 10, borderRadius: radius.sm },
  errTxt: { color: c.error, fontSize: 13, flex: 1 },
  hint: { fontSize: 12, color: c.muted, textAlign: "center", marginTop: 4 },
}));
