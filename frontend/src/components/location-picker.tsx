import React from "react";
import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/src/api";
import { Select } from "@/src/components/ui";
import { makeStyles } from "@/src/theme";

export type LocationValue = { provinsi: string; kabupaten_kota: string; kecamatan: string; wilayah_level_4: string };
type Item = { id: string; name: string };

const eq = (a?: string, b?: string) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

function useWilayah(path: string | null) {
  return useQuery<Item[]>({
    queryKey: ["wilayah", path],
    queryFn: () => apiGet(path as string),
    enabled: !!path,
    staleTime: Infinity,
  });
}

/** Ensure the currently stored name is selectable even if it is not in the reference list (legacy free-text). */
function toOptions(items: Item[] | undefined, current: string) {
  const opts = (items || []).map((i) => ({ value: i.name, label: i.name }));
  if (current && !opts.some((o) => eq(o.value, current))) opts.unshift({ value: current, label: `${current} (data lama)` });
  return opts;
}

/**
 * Cascading Provinsi -> Kab/Kota -> Kecamatan -> Kelurahan/Desa picker backed by
 * official Indonesian administrative reference data (/api/wilayah/*).
 */
export function LocationPicker({ value, onChange, errors, level4Label }: {
  value: LocationValue;
  onChange: (patch: Partial<LocationValue>) => void;
  errors?: Record<string, string>;
  level4Label: string;
}) {
  const s = useStyles();
  const provs = useWilayah("/wilayah/provinces");
  const provId = provs.data?.find((p) => eq(p.name, value.provinsi))?.id || null;
  const regs = useWilayah(provId ? `/wilayah/regencies/${provId}` : null);
  const regId = regs.data?.find((r) => eq(r.name, value.kabupaten_kota))?.id || null;
  const dists = useWilayah(regId ? `/wilayah/districts/${regId}` : null);
  const distId = dists.data?.find((d) => eq(d.name, value.kecamatan))?.id || null;
  const vills = useWilayah(distId ? `/wilayah/villages/${distId}` : null);

  const legacyHint = (parentName: string, parentId: string | null, parentLabel: string) =>
    parentName && !parentId && !provs.isLoading ? `${parentLabel} tidak dikenali, pilih ulang untuk memuat daftar` : undefined;

  return (
    <View style={{ gap: 12 }}>
      <Select label="Provinsi" required searchable testID="select-provinsi" value={value.provinsi || null}
        options={toOptions(provs.data, value.provinsi)} loading={provs.isLoading}
        emptyText={provs.isError ? "Gagal memuat data wilayah" : "Tidak ditemukan"}
        onChange={(v) => onChange({ provinsi: v, kabupaten_kota: "", kecamatan: "", wilayah_level_4: "" })} />
      {errors?.provinsi && <Text style={s.err}>{errors.provinsi}</Text>}

      <Select label="Kabupaten / Kota" required searchable testID="select-kabkota" value={value.kabupaten_kota || null}
        options={toOptions(regs.data, value.kabupaten_kota)} loading={regs.isLoading} disabled={!value.provinsi}
        placeholder={value.provinsi ? "Pilih kabupaten/kota" : "Pilih provinsi dulu"}
        hint={legacyHint(value.provinsi, provId, "Provinsi")}
        onChange={(v) => onChange({ kabupaten_kota: v, kecamatan: "", wilayah_level_4: "" })} />
      {errors?.kabupaten_kota && <Text style={s.err}>{errors.kabupaten_kota}</Text>}

      <Select label="Kecamatan" required searchable testID="select-kecamatan" value={value.kecamatan || null}
        options={toOptions(dists.data, value.kecamatan)} loading={dists.isLoading} disabled={!value.kabupaten_kota}
        placeholder={value.kabupaten_kota ? "Pilih kecamatan" : "Pilih kabupaten/kota dulu"}
        hint={value.kabupaten_kota ? legacyHint(value.kabupaten_kota, regId, "Kabupaten/Kota") : undefined}
        onChange={(v) => onChange({ kecamatan: v, wilayah_level_4: "" })} />
      {errors?.kecamatan && <Text style={s.err}>{errors.kecamatan}</Text>}

      <Select label={level4Label} required searchable testID="select-kelurahan" value={value.wilayah_level_4 || null}
        options={toOptions(vills.data, value.wilayah_level_4)} loading={vills.isLoading} disabled={!value.kecamatan}
        placeholder={value.kecamatan ? `Pilih ${level4Label.toLowerCase()}` : "Pilih kecamatan dulu"}
        hint={value.kecamatan ? legacyHint(value.kecamatan, distId, "Kecamatan") : undefined}
        onChange={(v) => onChange({ wilayah_level_4: v })} />
      {errors?.wilayah_level_4 && <Text style={s.err}>{errors.wilayah_level_4}</Text>}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  err: { fontSize: 12, color: c.error, marginTop: -6 },
}));
