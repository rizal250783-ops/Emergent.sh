import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "bsi_favorites_v1";

type Ctx = { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void; ready: boolean };
const FavCtx = createContext<Ctx>({ ids: [], has: () => false, toggle: () => {}, ready: false });

/** On-device favorites for public buyers (no login required). */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setIds(JSON.parse(raw)); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ids, has: (id: string) => ids.includes(id), toggle, ready }), [ids, toggle, ready]);
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>;
}

export const useFavorites = () => useContext(FavCtx);
