import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Modal, View, Text, TextInput } from "react-native";
import { makeStyles, useTheme, font } from "@/src/theme";
import { Button, spacing, radius } from "@/src/components/ui";

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "primary" | "danger";
  requireNote?: boolean;
  optionalNote?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
}
type Resolver = (val: { ok: boolean; note?: string }) => void;

const Ctx = createContext<(o: ConfirmOpts) => Promise<{ ok: boolean; note?: string }>>(
  async () => ({ ok: false })
);
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const resolver = useRef<Resolver | null>(null);
  const s = useStyles();
  const { colors } = useTheme();

  const confirm = useCallback((o: ConfirmOpts) => {
    setOpts(o);
    setNote("");
    setErr("");
    return new Promise<{ ok: boolean; note?: string }>((res) => {
      resolver.current = res;
    });
  }, []);

  const close = (ok: boolean) => {
    if (ok && opts?.requireNote && !note.trim()) {
      setErr("Catatan wajib diisi");
      return;
    }
    resolver.current?.({ ok, note: note.trim() });
    setOpts(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal visible={!!opts} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.title}>{opts?.title}</Text>
            {opts?.message && <Text style={s.message}>{opts.message}</Text>}
            {(opts?.requireNote || opts?.optionalNote) && (
              <View style={{ gap: 6 }}>
                {opts.noteLabel && <Text style={s.noteLabel}>{opts.noteLabel}</Text>}
                <TextInput
                  testID="confirm-note-input"
                  value={note}
                  onChangeText={(t) => { setNote(t); setErr(""); }}
                  placeholder={opts.notePlaceholder || "Tulis catatan..."}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={[s.note, err ? { borderColor: colors.error } : null]}
                />
                {err ? <Text style={[font(), { color: colors.error, fontSize: 12 }]}>{err}</Text> : null}
              </View>
            )}
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title={opts?.cancelText || "Batal"} variant="outline" onPress={() => close(false)} testID="confirm-cancel" />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={opts?.confirmText || "Lanjut"}
                  variant={opts?.tone === "danger" ? "danger" : "primary"}
                  onPress={() => close(true)}
                  testID="confirm-ok"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.xl },
  sheet: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  message: { fontSize: 14, color: c.onSurfaceSecondary, lineHeight: 20 },
  noteLabel: { fontSize: 13, fontWeight: "600", color: c.onSurface },
  note: { backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: 12, minHeight: 80, textAlignVertical: "top", color: c.onSurface },
}));
