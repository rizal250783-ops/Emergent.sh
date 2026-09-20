import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsReset, setNeedsReset] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ao360_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then(({ data }) => { setUser(data.user); setNeedsReset(data.requires_password_reset); })
      .catch(() => localStorage.removeItem("ao360_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (kode_marketing, password) => {
    const { data } = await api.post("/auth/login", { kode_marketing, password });
    localStorage.setItem("ao360_token", data.token);
    setUser(data.user);
    setNeedsReset(data.requires_password_reset);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) {}
    localStorage.removeItem("ao360_token");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, needsReset, setNeedsReset, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
