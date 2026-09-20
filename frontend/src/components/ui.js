import React from "react";
import { formatPct } from "../lib/api";

export function Card({ children, className = "", ...rest }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-soft ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Button({ children, variant = "primary", size = "md", className = "", ...rest }) {
  const variants = {
    primary: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm",
    gold: "bg-gold-600 text-white hover:bg-gold-700 shadow-sm",
    outline: "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-base" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Input({ label, className = "", ...rest }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>}
      <input
        className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors ${className}`}
        {...rest}
      />
    </label>
  );
}

export function Select({ label, children, className = "", ...rest }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>}
      <select
        className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-colors ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

const STATUS_STYLE = {
  excellent: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0", label: "Sangat Baik" },
  good: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", label: "Baik" },
  need_attention: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", label: "Perlu Perhatian" },
  critical: { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA", label: "Kritis" },
  na: { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0", label: "N/A" },
};

export function StatusBadge({ status, note }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.na;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
      data-testid={`status-badge-${status}`}
    >
      {note && status === "na" ? note : s.label}
    </span>
  );
}

export function Pill({ children, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gold: "bg-gold-50 text-gold-700 border-gold-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value }) {
  const v = Math.min(value || 0, 100);
  const color = v >= 100 ? "#047857" : v >= 85 ? "#1D4ED8" : v >= 70 ? "#D97706" : "#B91C1C";
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, backgroundColor: color }} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm p-4 sm:p-8" onClick={onClose}>
      <div className={`w-full ${w} bg-white rounded-2xl shadow-xl animate-in my-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none" data-testid="modal-close">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Table({ columns, rows, empty = "Belum ada data", testid }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100" data-testid={testid}>
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap ${c.className || ""}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">{empty}</td></tr>
          ) : (
            rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-emerald-50/40 transition-colors">
                {columns.map((c, ci) => (
                  <td key={ci} className={`px-4 py-3 ${c.className || ""}`}>{c.render ? c.render(row, ri) : row[c.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function KpiCard({ label, realisasi, target, achievement, status, note, icon, formatRp }) {
  return (
    <Card className="p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 h-full w-1 bg-gold-500/60" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-mono font-bold text-2xl sm:text-3xl text-ink tracking-tight">{formatRp(realisasi)}</div>
      <div className="mt-1 text-sm text-slate-500">Target: {formatRp(target)}</div>
      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={status} note={note} />
        <span className="font-heading font-bold text-emerald-700">{achievement === null ? note : formatPct(achievement)}</span>
      </div>
      <div className="mt-3"><ProgressBar value={achievement || 0} /></div>
    </Card>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="mb-5">
      <h2 className="font-heading text-2xl font-bold tracking-tight text-ink">{children}</h2>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-10 w-10 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 mb-6">
      {tabs.map((t) => (
        <button
          key={t.value}
          data-testid={`tab-${t.value}`}
          onClick={() => onChange(t.value)}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${active === t.value ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
