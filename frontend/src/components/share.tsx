import React, { useState, useCallback } from "react";
import { View, Text, Pressable, Modal, Share, Platform, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/src/theme";
import { publicAssetLink } from "@/src/api";
import { rupiah } from "@/src/format";
import { Icon, spacing, radius } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";

type ShareAsset = { id: string; judul_asset: string; nomor_asset?: string; harga_limit?: number | null; kabupaten_kota?: string; provinsi?: string };

export function buildShareMessage(a: ShareAsset) {
  const url = publicAssetLink(a.id);
  const lines = [
    `*${a.judul_asset}*`,
    a.harga_limit ? `Harga Limit: ${rupiah(a.harga_limit)}` : null,
    [a.kabupaten_kota, a.provinsi].filter(Boolean).join(", ") || null,
    a.nomor_asset ? `No. Asset: ${a.nomor_asset}` : null,
    "",
    `Lihat detail di BSI Asset Deal: ${url}`,
  ].filter((l) => l !== null);
  return { url, message: lines.join("\n") };
}

/**
 * Share an asset. Native -> OS share sheet (WhatsApp, IG, dll).
 * Web -> own sheet with WhatsApp / copy link / browser share.
 * Usage: const { share, sheet } = useShareAsset(); ... {sheet}
 */
export function useShareAsset() {
  const [target, setTarget] = useState<ShareAsset | null>(null);
  const toast = useToast();

  const share = useCallback(async (a: ShareAsset) => {
    const { url, message } = buildShareMessage(a);
    if (Platform.OS === "web") { setTarget(a); return; }
    try {
      await Share.share(Platform.OS === "ios" ? { message, url, title: a.judul_asset } : { message, title: a.judul_asset });
    } catch {
      toast("Tidak dapat membuka menu berbagi", "error");
    }
  }, [toast]);

  const sheet = <ShareSheet asset={target} onClose={() => setTarget(null)} />;
  return { share, sheet };
}

function ShareSheet({ asset, onClose }: { asset: ShareAsset | null; onClose: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  if (!asset) return null;
  const { url, message } = buildShareMessage(asset);
  const canNative = typeof navigator !== "undefined" && !!(navigator as any).share;

  const copy = async () => {
    await Clipboard.setStringAsync(url);
    toast("Tautan disalin", "success");
    onClose();
  };
  const wa = () => { Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`); onClose(); };
  const native = async () => {
    try { await (navigator as any).share({ title: asset.judul_asset, text: message, url }); } catch {}
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.title}>Bagikan Asset</Text>
          <Text style={s.sub} numberOfLines={1}>{asset.judul_asset}</Text>
          <View style={s.row}>
            <Opt icon="message-circle" label="WhatsApp" bg="#25D366" onPress={wa} testID="share-whatsapp" />
            <Opt icon="link" label="Salin Tautan" bg={colors.brandPrimary} onPress={copy} testID="share-copy" />
            {canNative && <Opt icon="share-2" label="Lainnya" bg={colors.onSurfaceSecondary} onPress={native} testID="share-more" />}
          </View>
          <View style={s.linkBox}><Text style={s.linkTxt} numberOfLines={1}>{url}</Text></View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Opt({ icon, label, bg, onPress, testID }: { icon: any; label: string; bg: string; onPress: () => void; testID: string }) {
  const s = useStyles();
  return (
    <Pressable style={s.opt} onPress={onPress} testID={testID}>
      <View style={[s.optIcon, { backgroundColor: bg }]}><Icon name={icon} size={22} color="#FFFFFF" /></View>
      <Text style={s.optTxt}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: 13, color: c.muted },
  row: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md, justifyContent: "center" },
  opt: { alignItems: "center", gap: 6, width: 84 },
  optIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  optTxt: { fontSize: 12, fontWeight: "600", color: c.onSurface, textAlign: "center" },
  linkBox: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  linkTxt: { fontSize: 12, color: c.onSurfaceSecondary },
}));
