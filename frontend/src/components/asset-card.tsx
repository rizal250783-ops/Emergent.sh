import React from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { makeStyles, useTheme } from "@/src/theme";
import { fileUrl } from "@/src/api";
import { rupiahShort, formatDate } from "@/src/format";
import { Icon, spacing, radius } from "@/src/components/ui";

export function AssetCard({ item, onPress, onShare, fav, onFav, width }: {
  item: any; onPress: () => void; onShare?: () => void; fav?: boolean; onFav?: () => void; width?: number;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const sold = item.is_sold || item.status === "SOLD";
  return (
    <Pressable style={[s.cardWrap, width ? { width } : s.cardFlex]} onPress={onPress} testID={`asset-card-${item.id}`}>
      <View style={s.cardImgWrap}>
        <Image source={{ uri: fileUrl(item.images?.[0]) }} style={s.cardImg} contentFit="cover" transition={200} />
        {sold ? (
          <View style={s.soldOverlay} testID={`sold-badge-${item.id}`}>
            <View style={s.soldRibbon}><Text style={s.soldTxt}>TERJUAL</Text></View>
          </View>
        ) : item.has_schedule ? (
          <View style={s.schedBadge}>
            <Icon name="calendar" size={11} color={colors.onBrandSecondary} />
            <Text style={s.schedTxt}>Sudah Ada Jadwal Lelang</Text>
          </View>
        ) : null}
        <View style={s.cardActions}>
          {onFav && (
            <Pressable style={s.cardIconBtn} onPress={onFav} hitSlop={6} testID={`fav-card-${item.id}`}>
              <Icon name="heart" size={14} color={fav ? colors.error : colors.brandPrimary} />
            </Pressable>
          )}
          {onShare && (
            <Pressable style={s.cardIconBtn} onPress={onShare} hitSlop={6} testID={`share-card-${item.id}`}>
              <Icon name="share-2" size={14} color={colors.brandPrimary} />
            </Pressable>
          )}
        </View>
      </View>
      <View style={{ padding: spacing.sm, gap: 4 }}>
        <Text style={s.cardCat}>{item.subkategori || item.kategori}</Text>
        <Text style={s.cardTitle} numberOfLines={2}>{item.judul_asset}</Text>
        <View style={s.cardLocRow}>
          <Icon name="map-pin" size={11} color={colors.muted} />
          <Text style={s.cardLoc} numberOfLines={1}>{item.kabupaten_kota}, {item.provinsi}</Text>
        </View>
        {!sold && item.penurunan_persen > 0 && (
          <View style={s.dropRow} testID={`price-drop-${item.id}`}>
            <Text style={s.oldPrice}>{rupiahShort(item.harga_sebelumnya)}</Text>
            <View style={s.dropBadge}><Icon name="trending-down" size={10} color="#FFFFFF" /><Text style={s.dropTxt}>{item.penurunan_persen}%</Text></View>
          </View>
        )}
        <Text style={[s.cardPrice, sold && { color: colors.muted, textDecorationLine: "line-through" }, !sold && item.penurunan_persen > 0 && { color: colors.success }]}>{rupiahShort(item.harga_limit)}</Text>
        {sold ? <Text style={s.cardSold}>Telah terjual</Text>
          : item.has_schedule ? <Text style={s.cardSched}>Lelang: {formatDate(item.tanggal_lelang)}</Text>
          : <Text style={s.cardNoSched}>Belum ada jadwal lelang</Text>}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  cardWrap: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  cardFlex: { flex: 1 },
  cardImgWrap: { position: "relative" },
  cardImg: { width: "100%", height: 130, backgroundColor: c.surfaceTertiary },
  schedBadge: { position: "absolute", left: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brandSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, maxWidth: "92%" },
  schedTxt: { color: c.onBrandSecondary, fontSize: 10, fontWeight: "800" },
  soldOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(17,24,39,0.45)", alignItems: "center", justifyContent: "center" },
  soldRibbon: { backgroundColor: c.error, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.sm, transform: [{ rotate: "-8deg" }] },
  soldTxt: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: 1.5 },
  cardActions: { position: "absolute", top: 8, right: 8, flexDirection: "row", gap: 6 },
  cardIconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  cardCat: { fontSize: 10, color: c.brandPrimary, fontWeight: "700", textTransform: "uppercase" },
  cardTitle: { fontSize: 13, fontWeight: "700", color: c.onSurface, lineHeight: 18, minHeight: 36 },
  cardLocRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardLoc: { fontSize: 11, color: c.muted, flex: 1 },
  cardPrice: { fontSize: 14, fontWeight: "900", color: c.onSurface, marginTop: 2 },
  dropRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  oldPrice: { fontSize: 11, color: c.muted, textDecorationLine: "line-through" },
  dropBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: c.success, paddingHorizontal: 5, height: 16, borderRadius: radius.pill },
  dropTxt: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  cardSched: { fontSize: 10, color: c.warning, fontWeight: "700" },
  cardNoSched: { fontSize: 10, color: c.muted },
  cardSold: { fontSize: 10, color: c.error, fontWeight: "700" },
}));
