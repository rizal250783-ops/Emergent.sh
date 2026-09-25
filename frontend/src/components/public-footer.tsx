import React from "react";
import { View, Text } from "react-native";
import { makeStyles } from "@/src/theme";
import { spacing } from "@/src/components/ui";

/** Institutional footer shown on public (visitor) screens. */
export function PublicFooter() {
  const s = useStyles();
  return (
    <View style={s.wrap} testID="public-footer">
      <View style={s.line} />
      <Text style={s.company}>PT. Bank Syariah Indonesia, Tbk</Text>
      <Text style={s.unit}>Retail Collection, Restructuring & Recovery Group (RCG)</Text>
      <Text style={s.year}>2026</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 2 },
  line: { width: 40, height: 2, borderRadius: 1, backgroundColor: c.border, marginBottom: spacing.sm },
  company: { fontSize: 12, fontWeight: "800", color: c.onSurfaceSecondary, textAlign: "center" },
  unit: { fontSize: 11, color: c.muted, textAlign: "center" },
  year: { fontSize: 11, color: c.muted, textAlign: "center", marginTop: 2 },
}));
