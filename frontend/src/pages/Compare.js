import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users2, X, GitCompare } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { api, apiError, formatRp, formatPct, periodeLabel } from "../lib/api";
import { usePeriod } from "../components/Layout";
import { Card, Spinner, SectionTitle, Select, Button, StatusBadge, Pill } from "../components/ui";

const COLORS = ["#047857", "#D97706", "#1D4ED8"];

export default function Compare() {
  const { periode } = usePeriod();
  const [users, setUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [komponen, setKomponen] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(data.filter((u) => ["AO Pembiayaan", "AO Funding", "Collection & Remedial"].includes(u.jabatan))));
  }, []);

  const addAO = (id) => {
    if (!id || picked.includes(id) || picked.length >= 3) return;
    setPicked([...picked, id]);
  };
  const removeAO = (id) => setPicked(picked.filter((x) => x !== id));

  const runCompare = () => {
    if (picked.length < 2) return toast.error("Pilih minimal 2 AO");
    setLoading(true);
    const kq = komponen ? `&komponen=${komponen}` : "";
    api.get(`/compare?ao_ids=${picked.join(",")}&periode=${periode}${kq}`)
      .then(({ data }) => setData(data))
      .catch((e) => toast.error(apiError(e.response?.data?.detail)))
      .finally(() => setLoading(false));
  };

  const nameById = (id) => users.find((u) => u.id === id)?.nama || id;

  // build merged trend data (achievement% per AO)
  const trend = [];
  if (data) {
    const monthsSet = new Set();
    data.items.forEach((it) => it.riwayat.forEach((r) => monthsSet.add(r.bulan)));
    const months = Array.from(monthsSet).sort();
    months.forEach((m) => {
      const row = { bulan: periodeLabel(m).split(" ")[0].slice(0, 3) };
      data.items.forEach((it, i) => {
        const r = it.riwayat.find((x) => x.bulan === m);
        const val = r ? (r.achievement || 0) : 0;
        row[`ao${i}`] = Math.min(val, 300); // clamp for readable axis (extreme % from tiny targets)
      });
      trend.push(row);
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle sub={`Bandingkan 2-3 AO berdampingan · ${periodeLabel(periode)}`}>Perbandingan Antar-AO</SectionTitle>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-72">
            <Select label="Tambah AO (maks 3)" onChange={(e) => { addAO(e.target.value); e.target.value = ""; }} data-testid="compare-add-select" defaultValue="">
              <option value="" disabled>Pilih AO…</option>
              {users.filter((u) => !picked.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.kode_marketing} · {u.nama} ({u.jabatan})</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-52">
            <Select label="Komponen" value={komponen} onChange={(e) => setKomponen(e.target.value)} data-testid="compare-komponen-select">
              <option value="">Semua (sesuai peran)</option>
              <option value="Pembiayaan">Pembiayaan</option>
              <option value="Funding">Funding</option>
              <option value="Recovery">Recovery (Kol.3)</option>
            </Select>
          </div>
          <Button onClick={runCompare} disabled={picked.length < 2} data-testid="compare-run-btn"><GitCompare size={16} /> Bandingkan</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {picked.length === 0 && <span className="text-sm text-slate-400">Belum ada AO dipilih.</span>}
          {picked.map((id, i) => (
            <span key={id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: COLORS[i], color: COLORS[i], backgroundColor: COLORS[i] + "12" }} data-testid={`compare-chip-${id}`}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              {nameById(id)}
              <button onClick={() => removeAO(id)} className="hover:opacity-60"><X size={14} /></button>
            </span>
          ))}
        </div>
      </Card>

      {loading && <Spinner />}

      {data && !loading && (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${data.items.length === 3 ? "lg:grid-cols-3" : ""} gap-4 sm:gap-6`}>
            {data.items.map((it, i) => (
              <Card key={i} className="p-5 relative overflow-hidden" data-testid={`compare-card-${i}`}>
                <div className="absolute top-0 left-0 h-1 w-full" style={{ backgroundColor: COLORS[i] }} />
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: COLORS[i] }}>{it.user.nama.charAt(0)}</div>
                  <div>
                    <div className="font-heading font-bold text-ink">{it.user.nama}</div>
                    <div className="text-xs text-slate-400">{it.user.jabatan} · {it.user.kode_marketing}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {it.kpis.map((k, ki) => (
                    <div key={ki} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k.komponen}</span>
                        <StatusBadge status={k.status} note={k.note} />
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <span className="font-mono font-bold text-lg text-ink">{formatRp(k.realisasi)}</span>
                        <span className="font-heading font-bold" style={{ color: COLORS[i] }}>{k.achievement === null ? "—" : formatPct(k.achievement)}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">Target: {formatRp(k.target)}</div>
                    </div>
                  ))}
                  {it.kpis.length === 0 && <div className="text-sm text-slate-400">Tidak ada komponen.</div>}
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-5 sm:p-6">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Users2 size={18} className="text-emerald-600" /> Tren Achievement Bulanan (%)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "#94a3b8" }} width={45} domain={[0, 300]} />
                <Tooltip formatter={(v) => (v >= 300 ? "≥300%" : formatPct(v))} />
                <Legend />
                {data.items.map((it, i) => (
                  <Line key={i} type="monotone" dataKey={`ao${i}`} name={it.user.nama} stroke={COLORS[i]} strokeWidth={2.5} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
