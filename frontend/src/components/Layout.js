import React, { createContext, useContext, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Trophy, History, ShieldCheck, ScrollText, ClipboardList,
  Target, Coins, MapPin, Users2, Database, LogOut, Menu, X, Wallet, Gift, ListChecks,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Select, Pill } from "./ui";
import { api, periodeOptions, currentPeriode } from "../lib/api";

const PeriodContext = createContext(null);
export const usePeriod = () => useContext(PeriodContext);

const ICONS = {
  dashboard: LayoutDashboard, leaderboard: Trophy, riwayat: History, approval: ShieldCheck,
  audit: ScrollText, input: ClipboardList, target: Target, incentive: Coins, collection: MapPin,
  users: Users2, data: Database, rekap: Wallet, myincentive: Gift, requests: ListChecks,
};

const MENUS = {
  "Direktur": [
    { to: "/executive", label: "Executive Dashboard", icon: "dashboard" },
    { to: "/leaderboard", label: "Ranking / Leaderboard", icon: "leaderboard" },
    { to: "/riwayat", label: "Riwayat Performance", icon: "riwayat" },
    { to: "/approval", label: "Approval Center", icon: "approval" },
    { to: "/audit", label: "Audit Log", icon: "audit" },
  ],
  "Admin": [
    { to: "/executive", label: "Dashboard Ringkasan", icon: "dashboard" },
    { to: "/input", label: "Input Pencapaian", icon: "input" },
    { to: "/targets", label: "Target Management", icon: "target" },
    { to: "/incentives", label: "Perhitungan Insentif", icon: "incentive" },
    { to: "/collection", label: "Collection Activity", icon: "collection" },
    { to: "/leaderboard", label: "Ranking / Leaderboard", icon: "leaderboard" },
    { to: "/riwayat", label: "Riwayat Performance", icon: "riwayat" },
    { to: "/users", label: "User Management", icon: "users" },
    { to: "/data", label: "Data Management", icon: "data" },
    { to: "/audit", label: "Audit Log", icon: "audit" },
  ],
  "AO Pembiayaan": [
    { to: "/dashboard", label: "Dashboard Pencapaian", icon: "dashboard" },
    { to: "/rekap", label: "Rekap Nasabah", icon: "rekap" },
    { to: "/riwayat", label: "Riwayat Performance", icon: "riwayat" },
    { to: "/collection", label: "Collection Activity", icon: "collection" },
    { to: "/my-incentives", label: "Insentif", icon: "myincentive" },
  ],
  "AO Funding": [
    { to: "/dashboard", label: "Dashboard Pencapaian", icon: "dashboard" },
    { to: "/rekap", label: "Rekap Simpanan", icon: "rekap" },
    { to: "/riwayat", label: "Riwayat Performance", icon: "riwayat" },
    { to: "/my-incentives", label: "Insentif", icon: "myincentive" },
  ],
  "Collection & Remedial": [
    { to: "/dashboard", label: "Dashboard Recovery", icon: "dashboard" },
    { to: "/rekap", label: "Rekap Recovery", icon: "rekap" },
    { to: "/riwayat", label: "Riwayat Performance", icon: "riwayat" },
    { to: "/collection", label: "Collection Activity", icon: "collection" },
    { to: "/my-incentives", label: "Insentif", icon: "myincentive" },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [periode, setPeriode] = useState(currentPeriode());
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const menu = MENUS[user?.jabatan] || [];
  const opts = periodeOptions();

  useEffect(() => {
    api.get("/meta/latest-periode").then(({ data }) => { if (data.latest) setPeriode(data.latest); }).catch(() => {});
  }, []);

  const NavItems = () => (
    <nav className="flex flex-col gap-1">
      {menu.map((m) => {
        const Icon = ICONS[m.icon] || LayoutDashboard;
        const active = location.pathname === m.to;
        return (
          <Link
            key={m.to}
            to={m.to}
            onClick={() => setOpen(false)}
            data-testid={`nav-${m.to.replace("/", "")}`}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-white/15 text-white" : "text-emerald-50/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={18} strokeWidth={2} />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-3 px-2 py-1">
      <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow">
        <img src="/logo.png" alt="BPRS Haji Miskin" className="h-8 w-8 object-contain" />
      </div>
      <div className="leading-tight">
        <div className="font-heading font-extrabold text-white text-lg tracking-tight">AO-360</div>
        <div className="text-[10px] uppercase tracking-wider text-emerald-100/80">Achievement Dashboard</div>
      </div>
    </div>
  );

  return (
    <PeriodContext.Provider value={{ periode, setPeriode }}>
      <div className="min-h-screen flex bg-slate-50">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 gradient-emerald grid-pattern shrink-0">
          <div className="p-5 border-b border-white/10"><Brand /></div>
          <div className="p-4 flex-1 overflow-y-auto"><NavItems /></div>
          <div className="p-4 border-t border-white/10">
            <div className="rounded-xl bg-white/10 p-3 mb-3">
              <div className="text-white font-semibold text-sm">{user?.nama}</div>
              <div className="text-emerald-100/80 text-xs">{user?.jabatan} · {user?.kode_marketing}</div>
            </div>
            <button onClick={logout} data-testid="logout-btn" className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-emerald-50 hover:bg-white/10 transition-colors">
              <LogOut size={18} /> Keluar
            </button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 gradient-emerald grid-pattern flex flex-col">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <Brand />
                <button onClick={() => setOpen(false)} className="text-white"><X size={22} /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto"><NavItems /></div>
              <div className="p-4 border-t border-white/10">
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-emerald-50 hover:bg-white/10">
                  <LogOut size={18} /> Keluar
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setOpen(true)} className="lg:hidden text-slate-600" data-testid="menu-toggle"><Menu size={22} /></button>
                <div className="hidden sm:block">
                  <div className="text-xs text-slate-400">PT BPRS Haji Miskin</div>
                  <div className="font-heading font-bold text-ink">{menu.find((m) => m.to === location.pathname)?.label || "Dashboard"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-44 sm:w-52">
                  <Select value={periode} onChange={(e) => setPeriode(e.target.value)} data-testid="period-filter">
                    {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </div>
                <div className="hidden sm:block"><Pill tone="gold">{user?.kode_marketing}</Pill></div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto animate-in">
            <Outlet />
          </main>
        </div>
      </div>
    </PeriodContext.Provider>
  );
}
