import React from "react";
import {
  View, Text, Pressable, ActivityIndicator, TextInput, ScrollView, Modal,
  StyleProp, ViewStyle, TextStyle,
} from "react-native";
import Icon from "@react-native-vector-icons/feather";
import { makeStyles, useTheme, ThemeColors } from "@/src/theme";
import { Tone } from "@/src/format";

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

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
  const bg = {
    primary: colors.brandPrimary, secondary: colors.brandSecondary,
    outline: "transparent", danger: colors.error, ghost: "transparent",
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary, secondary: colors.onBrandSecondary,
    outline: colors.brandPrimary, danger: colors.onError, ghost: colors.onSurface,
  }[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "outline" && { borderWidth: 1.5, borderColor: colors.brandPrimary },
        full && { alignSelf: "stretch" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={s.row}>
          {icon && <Icon name={icon as any} size={18} color={fg} />}
          <Text style={[s.txt, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
const useBtnStyles = makeStyles((c) => ({
  btn: { height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  txt: { fontSize: 16, fontWeight: "700" },
}));

// ---------------- Badge ----------------
export function Badge({ label, tone = "neutral", testID }: { label: string; tone?: Tone; testID?: string }) {
  const { colors } = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: "#DCFCE7", fg: "#047857" },
    warning: { bg: "#FEF3C7", fg: "#B45309" },
    error: { bg: "#FEE2E2", fg: "#B91C1C" },
    info: { bg: "#E2E8F0", fg: "#334155" },
    brand: { bg: colors.brandTertiary, fg: colors.onBrandTertiary },
    neutral: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
  };
  const { bg, fg } = map[tone];
  return (
    <View testID={testID} style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

// ---------------- Card ----------------
export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const s = useCardStyles();
  return <View testID={testID} style={[s.card, style]}>{children}</View>;
}
const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: c.border,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
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
  const s = useFieldStyles();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={s.label}>
          {label}{required && <Text style={{ color: colors.error }}> *</Text>}
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
          style={[s.input, multiline && { height: 96, textAlignVertical: "top", paddingTop: 12 },
            rightIcon && { paddingRight: 46 },
            !editable && { backgroundColor: colors.surfaceTertiary, color: colors.muted },
            error && { borderColor: colors.error }]}
        />
        {rightIcon && (
          <Pressable onPress={onRightPress} style={{ position: "absolute", right: 0, height: 48, width: 46, alignItems: "center", justifyContent: "center" }} testID={`${testID}-right`}>
            <Icon name={rightIcon as any} size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}
const useFieldStyles = makeStyles((c) => ({
  label: { fontSize: 13, fontWeight: "600", color: c.onSurface },
  input: {
    backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border,
    borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontSize: 15, color: c.onSurface,
  },
  err: { fontSize: 12, color: c.error },
}));

// ---------------- State views ----------------
export function Loading({ text }: { text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md }}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
      {text && <Text style={{ color: colors.muted }}>{text}</Text>}
    </View>
  );
}

export function EmptyState({ icon = "inbox", title, subtitle, action, testID }: {
  icon?: string; title: string; subtitle?: string; action?: React.ReactNode; testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={{ alignItems: "center", justifyContent: "center", padding: spacing["2xl"], gap: spacing.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon as any} size={30} color={colors.brandPrimary} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" }}>{title}</Text>
      {subtitle && <Text style={{ color: colors.muted, textAlign: "center" }}>{subtitle}</Text>}
      {action}
    </View>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: spacing["2xl"], gap: spacing.md }}>
      <Icon name="alert-triangle" size={30} color={colors.error} />
      <Text style={{ color: colors.onSurface, textAlign: "center" }}>{message || "Gagal memuat data"}</Text>
      {onRetry && <Button title="Coba Lagi" onPress={onRetry} full={false} variant="outline" icon="refresh-cw" testID="retry-button" />}
    </View>
  );
}

// Skeleton block
export function Skeleton({ h = 16, w = "100%", style }: { h?: number; w?: any; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: h, width: w, backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm }, style]} />;
}

// ---------------- Select (modal dropdown) ----------------
export function Select({
  label, value, placeholder = "Pilih...", options, onChange, required, testID, disabled,
}: {
  label?: string; value?: string | null; placeholder?: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; required?: boolean; testID?: string; disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const s = useSelectStyles();
  const { colors } = useTheme();
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={s.label}>{label}{required && <Text style={{ color: colors.error }}> *</Text>}</Text>
      )}
      <Pressable testID={testID} disabled={disabled} onPress={() => setOpen(true)} style={[s.box, disabled && { opacity: 0.5 }]}>
        <Text style={[s.value, !selected && { color: colors.muted }]} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{label || "Pilih"}</Text>
              <Pressable onPress={() => setOpen(false)}><Icon name="x" size={22} color={colors.onSurface} /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {options.map((o) => (
                <Pressable key={o.value} testID={`option-${o.value}`} style={s.opt} onPress={() => { onChange(o.value); setOpen(false); }}>
                  <Text style={[s.optTxt, o.value === value && { color: colors.brandPrimary, fontWeight: "800" }]}>{o.label}</Text>
                  {o.value === value && <Icon name="check" size={18} color={colors.brandPrimary} />}
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
  label: { fontSize: 13, fontWeight: "600", color: c.onSurface },
  box: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 14, height: 48 },
  value: { fontSize: 15, color: c.onSurface, flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: c.onSurface },
  opt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.divider },
  optTxt: { fontSize: 15, color: c.onSurface },
}));

export { Icon };

// ---------------- Screen header (sticky, brand) ----------------
export function ScreenHeader({ title, subtitle, right, onBack }: {
  title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void;
}) {
  const s = useHeaderStyles();
  const { colors } = useTheme();
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {onBack && (
          <Pressable onPress={onBack} style={s.back} testID="header-back">
            <Icon name="arrow-left" size={22} color={colors.onBrandPrimary} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}
const useHeaderStyles = makeStyles((c) => ({
  wrap: { backgroundColor: c.brandPrimary, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  title: { color: c.onBrandPrimary, fontSize: 20, fontWeight: "800" },
  sub: { color: "#E6F6F6", fontSize: 12, marginTop: 1 },
}));

// ---------------- Stat card ----------------
export function StatCard({ label, value, tone = "neutral", icon }: {
  label: string; value: number | string; tone?: Tone; icon?: string;
}) {
  const { colors } = useTheme();
  const toneColor: Record<Tone, string> = {
    success: colors.success, warning: colors.warning, error: colors.error,
    info: colors.info, brand: colors.brandPrimary, neutral: colors.onSurface,
  };
  return (
    <View style={{
      flex: 1, minWidth: "30%", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4,
    }}>
      {icon && <Icon name={icon as any} size={16} color={toneColor[tone]} />}
      <Text style={{ fontSize: 22, fontWeight: "900", color: toneColor[tone] }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.muted }} numberOfLines={2}>{label}</Text>
    </View>
  );
}
