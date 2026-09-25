import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/src/api";

const KEY = "bsi_favorites_v1";
const SNAP_KEY = "bsi_favorites_snapshot_v1";

export type FavSnapshot = { judul_asset: string; harga_limit: number | null; has_schedule: boolean; tanggal_lelang: string | null; is_sold: boolean };
export type FavUpdate = { id: string; judul_asset: string; changes: { type: "price" | "schedule" | "sold"; text: string }[] };

type Ctx = {
  ids: string[]; has: (id: string) => boolean; toggle: (id: string, item?: any) => void; ready: boolean;
  snapshots: Record<string, FavSnapshot>; setSnapshots: (s: Record<string, FavSnapshot>) => void;
};
const FavCtx = createContext<Ctx>({ ids: [], has: () => false, toggle: () => {}, ready: false, snapshots: {}, setSnapshots: () => {} });

export function snapshotOf(a: any): FavSnapshot {
  return { judul_asset: a.judul_asset, harga_limit: a.harga_limit ?? null, has_schedule: !!a.has_schedule, tanggal_lelang: a.tanggal_lelang ?? null, is_sold: !!a.is_sold };
}

/** On-device favorites for public buyers (no login required) + snapshot for change detection. */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [snapshots, setSnapState] = useState<Record<string, FavSnapshot>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(SNAP_KEY)])
      .then(([raw, snap]) => { if (raw) setIds(JSON.parse(raw)); if (snap) setSnapState(JSON.parse(snap)); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setSnapshots = useCallback((s: Record<string, FavSnapshot>) => {
    setSnapState(s);
    AsyncStorage.setItem(SNAP_KEY, JSON.stringify(s)).catch(() => {});
  }, []);

  const toggle = useCallback((id: string, item?: any) => {
    setIds((prev) => {
      const adding = !prev.includes(id);
      const next = adding ? [id, ...prev] : prev.filter((x) => x !== id);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      setSnapState((snap) => {
        const ns = { ...snap };
        if (adding && item) ns[id] = snapshotOf(item); else if (!adding) delete ns[id];
        AsyncStorage.setItem(SNAP_KEY, JSON.stringify(ns)).catch(() => {});
        return ns;
      });
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ids, has: (id: string) => ids.includes(id), toggle, ready, snapshots, setSnapshots }), [ids, toggle, ready, snapshots, setSnapshots]);
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>;
}

export const useFavorites = () => useContext(FavCtx);

const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const tgl = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/**
 * Compares current data of favorited assets with the stored snapshot and reports
 * price drops / new auction schedules / sold status. Buyers have no account, so this is
 * the in-app "notification" channel. Also seeds snapshots for legacy favorites.
 */
export function useFavoriteUpdates() {
  const { ids, ready, snapshots, setSnapshots } = useFavorites();
  const q = useQuery<any[]>({
    queryKey: ["favorites", ids.join(",")],
    queryFn: () => apiGet(`/public/catalog/batch?ids=${encodeURIComponent(ids.join(","))}`),
    enabled: ready && ids.length > 0,
    staleTime: 30_000,
  });
  const items = ids.length ? q.data || [] : [];

  // Seed snapshots for favorites saved before snapshots existed (no false alerts)
  useEffect(() => {
    if (!items.length) return;
    const missing = items.filter((a) => !snapshots[a.id]);
    if (missing.length) {
      const ns = { ...snapshots };
      missing.forEach((a) => { ns[a.id] = snapshotOf(a); });
      setSnapshots(ns);
    }
  }, [items, snapshots, setSnapshots]);

  const updates: FavUpdate[] = useMemo(() => {
    const out: FavUpdate[] = [];
    for (const a of items) {
      const s = snapshots[a.id];
      if (!s) continue;
      const changes: FavUpdate["changes"] = [];
      if (s.harga_limit && a.harga_limit && a.harga_limit < s.harga_limit) {
        const pct = Math.round((s.harga_limit - a.harga_limit) / s.harga_limit * 100);
        changes.push({ type: "price", text: `Harga turun ${pct}%: ${rupiah(s.harga_limit)} → ${rupiah(a.harga_limit)}` });
      }
      if (!s.has_schedule && a.has_schedule && a.tanggal_lelang) {
        changes.push({ type: "schedule", text: `Jadwal lelang keluar: ${tgl(a.tanggal_lelang)}` });
      } else if (s.has_schedule && a.has_schedule && a.tanggal_lelang && s.tanggal_lelang && a.tanggal_lelang !== s.tanggal_lelang) {
        changes.push({ type: "schedule", text: `Jadwal lelang berubah: ${tgl(a.tanggal_lelang)}` });
      }
      if (!s.is_sold && a.is_sold) changes.push({ type: "sold", text: "Asset ini telah terjual" });
      if (changes.length) out.push({ id: a.id, judul_asset: a.judul_asset, changes });
    }
    return out;
  }, [items, snapshots]);

  const markSeen = useCallback((id?: string) => {
    const ns = { ...snapshots };
    items.filter((a) => !id || a.id === id).forEach((a) => { ns[a.id] = snapshotOf(a); });
    setSnapshots(ns);
  }, [items, snapshots, setSnapshots]);

  return { items, updates, markSeen, isLoading: q.isLoading, isError: q.isError, refetch: q.refetch, isRefetching: q.isRefetching };
}
