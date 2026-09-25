import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { apiGet, apiPost, TOKEN_KEY } from "@/src/api";

export type Role = "marketing_asset" | "acrm" | "admin_rcg";

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  nama?: string;
  data_flag?: string;
  force_password_change?: boolean;
  acr?: { id: string; nama: string; identifier?: string } | null;
  acrm?: { id: string; nama: string; nip?: string } | null;
  ma?: { id: string; nama: string; nip: string; hp: string } | null;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await storage.secureGet(TOKEN_KEY, "");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await apiGet("/auth/me");
      setUser(me);
    } catch {
      await storage.secureRemove(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (username: string, password: string) => {
    const res = await apiPost("/auth/login", { username, password });
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setUser(res.user);
  };

  const logout = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
