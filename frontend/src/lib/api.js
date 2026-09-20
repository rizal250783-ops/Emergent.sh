import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ao360_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes("/auth/login")) {
      localStorage.removeItem("ao360_token");
      if (!window.location.pathname.includes("/login")) window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export function apiError(detail) {
  if (detail == null) return "Terjadi kesalahan. Coba lagi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function formatRp(n) {
  if (n === null || n === undefined) return "Rp 0";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function formatRpShort(n) {
  if (n === null || n === undefined) return "Rp 0";
  const a = Math.abs(n);
  if (a >= 1e9) return "Rp " + (n / 1e9).toFixed(2).replace(".", ",") + " M";
  if (a >= 1e6) return "Rp " + (n / 1e6).toFixed(1).replace(".", ",") + " Jt";
  return formatRp(n);
}

export function formatPct(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%";
}

export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function periodeLabel(p) {
  if (!p) return "";
  const [y, m] = p.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

export function periodeOptions() {
  const opts = [];
  const now = new Date();
  let y = 2026, m = 0;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
    const p = `${y}-${String(m + 1).padStart(2, "0")}`;
    opts.push({ value: p, label: `${MONTHS[m]} ${y}` });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  // ensure at least current
  if (opts.length === 0) {
    const p = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value: p, label: periodeLabel(p) });
  }
  return opts.reverse();
}

export function currentPeriode() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
