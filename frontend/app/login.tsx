import React, { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, font, gradients } from "@/src/theme";
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
    <View style={s.screen}>
      <LinearGradient colors={gradients.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* decorative blobs */}
      <View style={[s.blob, s.blob1]} />
      <View style={[s.blob, s.blob2]} />
      <View style={[s.blob, s.blob3]} />
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <Pressable
          style={({ pressed }) => [s.back, pressed && { transform: [{ scale: 0.94 }] }]}
          onPress={() => router.replace("/")}
          testID="login-back"
        >
          <Icon name="arrow-left" size={22} color={colors.onBrandPrimary} />
        </Pressable>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.logoGlass}>
              <Image source={require("../assets/images/bsi-logo.png")} style={s.logoImg} contentFit="contain" />
            </View>
            <Text style={s.appName}>BSI ASSET DEAL</Text>
            <Text style={s.tagline}>Menghubungkan Investor dengan Asset BSI</Text>
            <View style={s.goldDivider}>
              <View style={s.goldDividerLine} />
              <View style={s.goldDividerDot} />
              <View style={s.goldDividerLine} />
            </View>
            <Text style={s.org}>PT. Bank Syariah Indonesia, Tbk</Text>
            <Text style={s.orgSub}>Retail Collection, Restructuring & Recovery Group (RCG)</Text>

            <View style={s.form}>
              <Text style={s.formTitle}>Masuk ke Akun Anda</Text>
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
                variant="ghost"
                icon="arrow-left"
                onPress={() => router.replace("/")}
                testID="login-back-button"
                style={{ borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)" }}
              />
              <Text style={s.hint}>Gunakan NIP dan password yang diberikan Admin RCG.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.brandPrimaryDark },
  blob: { position: "absolute", borderRadius: 999 },
  blob1: { top: -80, right: -60, width: 260, height: 260, backgroundColor: "rgba(255,255,255,0.07)" },
  blob2: { bottom: 80, left: -70, width: 220, height: 220, backgroundColor: "rgba(240,180,60,0.12)" },
  blob3: { top: 160, left: 40, width: 90, height: 90, backgroundColor: "rgba(178,228,228,0.10)" },
  back: { position: "absolute", left: spacing.lg, top: spacing.xl, zIndex: 2, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  logoGlass: {
    backgroundColor: "rgba(255,255,255,0.94)", borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    shadowColor: "#002E2E", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  logoImg: { width: 200, height: 56 },
  appName: { ...font("900"), fontSize: 26, color: "#FFFFFF", marginTop: spacing.lg, letterSpacing: 1.2 },
  tagline: { fontSize: 13, color: "#B2E4E4", fontStyle: "italic", marginTop: 4 },
  goldDivider: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.md },
  goldDividerLine: { width: 42, height: 1.5, backgroundColor: "rgba(240,180,60,0.7)", borderRadius: 1 },
  goldDividerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.brandSecondary },
  org: { ...font("700"), fontSize: 13, color: "#FFFFFF", marginTop: spacing.sm },
  orgSub: { fontSize: 12, color: "#B2E4E4", textAlign: "center", marginTop: 2 },
  form: {
    width: "100%", marginTop: spacing.xl, gap: spacing.md, backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
    shadowColor: "#002E2E", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  formTitle: { ...font("800"), fontSize: 18, color: "#FFFFFF", marginBottom: 2 },
  errBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FBE3E3", padding: 12, borderRadius: radius.sm },
  errTxt: { color: c.error, fontSize: 13, flex: 1 },
  hint: { fontSize: 12, color: "#B2E4E4", textAlign: "center", marginTop: 4 },
}));
