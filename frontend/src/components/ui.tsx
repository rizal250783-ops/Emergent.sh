import React from "react";
import {
  View, Text, Pressable, ActivityIndicator, TextInput, ScrollView, Modal, Platform,
  StyleProp, ViewStyle, TextStyle, StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "@react-native-vector-icons/feather";
import { makeStyles, useTheme, ThemeColors, font, gradients } from "@/src/theme";
import { Tone } from "@/src/format";

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

// ---------------- Button ----------------
export function Button({
  title, onPress, variant = "primary", loading, disabled, icon, style, testID, full = true,
}: {
  title: string; onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  loading?: boolean; disabled?: boolean; icon?: string;
  style?: StyleProp<ViewStyle>; testID?: string; full?: boolean;
}) {
  const s = useBtnStyles();
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const fg = {
    primary: colors.onBrandSecondary,
    secondary: colors.onBrandSecondary,
    outline: colors.brandPrimary,
    danger: colors.onError,
    ghost: colors.onSurface,
  }[variant];

  const inner = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <View style={s.row}>
      {icon && <Icon name={icon as any} size={18} color={fg} />}
      <Text style={[s.txt, { color: fg }]}>{title}</Text>
    </View>
  );

  if (variant === "primary" && !isDisabled) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.92 : 1, alignSelf: full ? "stretch" : "auto" }, style]}
      >
        <LinearGradient colors={gradients.goldSoft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.btn, s.shadowGold]}>
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }
  if (variant === "primary" && isDisabled) {
    return (
      <Pressable testID={testID} disabled style={[s.btn, { backgroundColor: colors.brandSecondary, opacity: 0.55 }, full && { alignSelf: "stretch" }, style]}>
        {inner}
      </Pressable>
    );
  }
  const bg = {
    primary: colors.brandPrimary, secondary: colors.brandSecondary,
    outline: "transparent", danger: colors.error, ghost: "transparent",
  }[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        variant === "outline" && { borderWidth: 1.5, borderColor: colors.brandPrimary },
        variant === "secondary" && s.shadowGold,
        full && { alignSelf: "stretch" },
        style,
      ]}
    >
      {inner}
    </Pressable>
  );
}
const useBtnStyles = makeStyles((c) => ({
  btn: { height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  txt: { fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  shadowGold: { shadowColor: "#C98F1F", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
}));

// ---------------- Badge ----------------
export function Badge({ label, tone = "neutral", testID }: { label: string; tone?: Tone; testID?: string }) {
  const { colors } = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: "#D9F2E8", fg: "#146C50" },
    warning: { bg: colors.brandSecondarySoft, fg: colors.onBrandSecondarySoft },
    error: { bg: "#FBE3E3", fg: "#A62828" },
    info: { bg: "#E4EEF0", fg: "#33565A" },
    brand: { bg: colors.brandTertiary, fg: colors.onBrandTertiary },
    neutral: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
  };
  const { bg, fg } = map[tone];
  return (
    <View testID={testID} style={{ backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" }}>
      <Text style={[font("700"), { color: fg, fontSize: 11, letterSpacing: 0.2 }]}>{label}</Text>
    </View>
  );
}

// ---------------- Card ----------------
export function Card({ children, style, testID, accent }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string; accent?: boolean }) {
  const s = useCardStyles();
  return (
    <View testID={testID} style={[s.card, accent && s.accent, style]}>
      {accent && <View style={s.accentLine} />}
      {children}
    </View>
  );
}
const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: c.border,
    shadowColor: "#004D4D", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  accent: { borderWidth: 1, borderColor: "rgba(240,180,60,0.55)" },
  accentLine: { position: "absolute", top: 0, left: spacing.lg, right: spacing.lg, height: 2, backgroundColor: c.goldBorder, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
}));

// ---------------- Field ----------------
export function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline, testID,
  required, editable = true, error, autoCapitalize, secureTextEntry,
  rightIcon, onRightPress,
}: {
  label?: string; value: string; onChangeText?: (t: string) => void; placeholder?: string;
  keyboardType?: any; multiline?: boolean; testID?: string; required?: boolean;
  editable?: boolean; error?: string; autoCapitalize?: any; secureTextEntry?: boolean;
  rightIcon?: string; onRightPress?: () => void;
}) {
  const [focused, setFocused] = React.useState(false);
  const s = useFieldStyles();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={s.label}>
          {label}{required && <Text style={[font(), { color: colors.error }]}> *</Text>}
        </Text>
      )}
      <View style={{ position: "relative", justifyContent: "center" }}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[s.input, multiline && { height: 96, textAlignVertical: "top", paddingTop: 12 },
            rightIcon && { paddingRight: 46 },
            focused && !error && editable && s.inputFocus,
            !editable && { backgroundColor: colors.surfaceTertiary, color: colors.muted },
            error && { borderColor: colors.error, borderWidth: 1.5 }]}
        />
        {rightIcon && (
          <Pressable onPress={onRightPress} style={{ position: "absolute", right: 0, height: 52, width: 48, alignItems: "center", justifyContent: "center" }} testID={`${testID}-right`}>
            <Icon name={rightIcon as any} size={18} color={focused ? colors.brandPrimary : colors.muted} />
          </Pressable>
        )}
      </View>
      {error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}
const useFieldStyles = makeStyles((c) => ({
  label: { fontSize: 13, fontWeight: "700", color: c.onSurface, letterSpacing: 0.1 },
  input: {
    backgroundColor: c.surfaceSecondary, borderWidth: 1.5, borderColor: c.border,
    borderRadius: radius.md, paddingHorizontal: 16, height: 52, fontSize: 15, color: c.onSurface,
  },
  inputFocus: { borderColor: c.brandPrimary, shadowColor: c.brandPrimary, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  err: { fontSize: 12, color: c.error },
}));

// ---------------- State views ----------------
export function Loading({ text }: { text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md }}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
      {text && <Text style={[font(), { color: colors.muted }]}>{text}</Text>}
    </View>
  );
}

export function EmptyState({ icon = "inbox", title, subtitle, action, testID }: {
  icon?: string; title: string; subtitle?: string; action?: React.ReactNode; testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={{ alignItems: "center", justifyContent: "center", padding: spacing["2xl"], gap: spacing.md }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandSoftMid, alignItems: "center", justifyContent: "center", shadowColor: "#00A0A0", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
        <Icon name={icon as any} size={34} color={colors.brandPrimary} />
      </View>
      <Text style={[font("700"), { fontSize: 17, color: colors.onSurface, textAlign: "center" }]}>{title}</Text>
      {subtitle && <Text style={[font(), { color: colors.muted, textAlign: "center", lineHeight: 21 }]}>{subtitle}</Text>}
      {action}
    </View>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: spacing["2xl"], gap: spacing.md }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "#FBE3E3", alignItems: "center", justifyContent: "center" }}>
        <Icon name="alert-triangle" size={32} color={colors.error} />
      </View>
      <Text style={[font(), { color: colors.onSurface, textAlign: "center" }]}>{message || "Gagal memuat data"}</Text>
      {onRetry && <Button title="Coba Lagi" onPress={onRetry} full={false} variant="outline" icon="refresh-cw" testID="retry-button" />}
    </View>
  );
}

// Skeleton block
export function Skeleton({ h = 16, w = "100%", style }: { h?: number; w?: any; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: h, width: w, backgroundColor: colors.brandTertiary, borderRadius: radius.sm, overflow: "hidden" }, style]} />;
}

// ---------------- Select (modal dropdown) ----------------
export function Select({
  label, value, placeholder = "Pilih...", options, onChange, required, testID, disabled,
  searchable, loading, emptyText = "Tidak ada pilihan", hint, trigger,
}: {
  label?: string; value?: string | null; placeholder?: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; required?: boolean; testID?: string; disabled?: boolean;
  searchable?: boolean; loading?: boolean; emptyText?: string; hint?: string;
  /** Custom trigger element (e.g. a chip); replaces the default label + box */
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const s = useSelectStyles();
  const { colors } = useTheme();
  const selected = options.find((o) => o.value === value);
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const close = () => { setOpen(false); setQ(""); };
  return (
    <View style={{ gap: 6 }}>
      {trigger ? trigger(() => setOpen(true)) : (
        <>
          {label && (
            <Text style={s.label}>{label}{required && <Text style={[font(), { color: colors.error }]}> *</Text>}</Text>
          )}
          <Pressable testID={testID} disabled={disabled || loading} onPress={() => setOpen(true)} style={[s.box, (disabled || loading) && { opacity: 0.5 }]}>
            <Text style={[s.value, !selected && { color: colors.muted }]} numberOfLines={1}>
              {selected?.label || (value && !loading ? value : null) || (loading ? "Memuat..." : placeholder)}
            </Text>
            {loading ? <ActivityIndicator size="small" color={colors.brandPrimary} /> : <Icon name="chevron-down" size={18} color={colors.brandPrimary} />}
          </Pressable>
          {hint && <Text style={s.hint}>{hint}</Text>}
        </>
      )}
      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={s.backdrop} onPress={close}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{label || "Pilih"}</Text>
              <Pressable onPress={close} testID={`${testID}-close`}><Icon name="x" size={22} color={colors.onSurface} /></Pressable>
            </View>
            {searchable && (
              <View style={s.search}>
                <Icon name="search" size={16} color={colors.muted} />
                <TextInput value={q} onChangeText={setQ} placeholder="Cari..." placeholderTextColor={colors.muted} style={s.searchInput} testID={`${testID}-search`} autoFocus={Platform.OS === "web"} />
                {q.length > 0 && <Pressable onPress={() => setQ("")}><Icon name="x" size={16} color={colors.muted} /></Pressable>}
              </View>
            )}
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {shown.length === 0 && <Text style={s.empty}>{emptyText}</Text>}
              {shown.map((o) => (
                <Pressable key={o.value} testID={`option-${o.value}`} style={({ pressed }) => [s.opt, pressed && { backgroundColor: colors.brandTertiary }, o.value === value && s.optActive]} onPress={() => { onChange(o.value); close(); }}>
                  <Text style={[s.optTxt, o.value === value && { color: colors.onBrandTertiary, fontWeight: "800" }]}>{o.label}</Text>
                  {o.value === value && <Icon name="check" size={18} color={colors.brandSecondaryDark} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
const useSelectStyles = makeStyles((c) => ({
  label: { fontSize: 13, fontWeight: "700", color: c.onSurface },
  hint: { fontSize: 12, color: c.muted },
  box: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderWidth: 1.5, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 16, height: 52 },
  value: { fontSize: 15, color: c.onSurface, flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,46,46,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: c.brandSoftMid, alignSelf: "center", marginBottom: spacing.md },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.brandTertiary, borderRadius: radius.md, paddingHorizontal: 12, height: 44, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, color: c.onSurface },
  empty: { color: c.muted, textAlign: "center", paddingVertical: spacing.lg },
  opt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 10, borderRadius: radius.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  optActive: { backgroundColor: c.brandTertiary, borderBottomWidth: 0 },
  optTxt: { fontSize: 15, color: c.onSurface },
}));

export { Icon };

// ---------------- Screen header (sticky, brand gradient) ----------------
export function ScreenHeader({ title, subtitle, right, onBack }: {
  title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void;
}) {
  const s = useHeaderStyles();
  const { colors } = useTheme();
  return (
    <View style={s.wrap}>
      <LinearGradient colors={gradients.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={s.deco1} />
      <View style={s.deco2} />
      <View style={s.row}>
        {onBack && (
          <Pressable onPress={onBack} style={({ pressed }) => [s.back, pressed && { transform: [{ scale: 0.94 }] }]} testID="header-back">
            <Icon name="arrow-left" size={22} color={colors.onBrandPrimary} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      <View style={s.goldLine} />
    </View>
  );
}
const useHeaderStyles = makeStyles((c) => ({
  wrap: { backgroundColor: c.brandPrimaryDark, overflow: "hidden" },
  deco1: { position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.06)" },
  deco2: { position: "absolute", bottom: -50, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(240,180,60,0.10)" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginLeft: -6, backgroundColor: "rgba(255,255,255,0.15)" },
  title: { color: c.onBrandPrimary, fontSize: 22, fontWeight: "900", letterSpacing: 0.2 },
  sub: { color: "#B2E4E4", fontSize: 12, marginTop: 2 },
  goldLine: { height: 2, backgroundColor: c.brandSecondary },
}));

// ---------------- Stat card ----------------
export function StatCard({ label, value, tone = "neutral", icon }: {
  label: string; value: number | string; tone?: Tone; icon?: string;
}) {
  const { colors } = useTheme();
  const toneColor: Record<Tone, string> = {
    success: colors.success, warning: colors.brandSecondaryDark, error: colors.error,
    info: colors.info, brand: colors.brandPrimaryDark, neutral: colors.onSurface,
  };
  return (
    <View style={{
      flex: 1, minWidth: "30%", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4,
      shadowColor: "#004D4D", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    }}>
      {icon && (
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
          <Icon name={icon as any} size={15} color={toneColor[tone]} />
        </View>
      )}
      <Text style={[font("900"), { fontSize: 24, color: toneColor[tone] }]}>{value}</Text>
      <Text style={[font(), { fontSize: 11, color: colors.muted, lineHeight: 15 }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}
