import React, { useEffect, useState } from "react";
import { Trophy, Medal } from "lucide-react";
import { api, formatRp, formatPct, periodeLabel } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { usePeriod } from "../components/Layout";
import { Card, Spinner, SectionTitle, Table, StatusBadge, Tabs } from "../components/ui";

export default function Leaderboard() {
  const { periode } = usePeriod();
  const { user } = useAuth();
  const [komponen, setKomponen] = useState("Pembiayaan");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/leaderboard?komponen=${encodeURIComponent(komponen)}&periode=${periode}`).then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, [komponen, periode]);

  const columns = [
    { header: "Rank", render: (r, i) => {
        const rank = r.ranking;
        if (!rank) return <span className="text-slate-300 font-bold">—</span>;
        const colors = { 1: "text-gold-500", 2: "text-slate-400", 3: "text-amber-700" };
        return <span className={`inline-flex items-center gap-1 font-bold ${colors[rank] || "text-slate-500"}`}>{rank <= 3 && <Medal size={16} />}{rank}</span>;
      }, className: "w-16" },
    { header: "Nama", render: (r) => <div className="font-semibold text-ink">{r.nama}</div> },
    { header: "Kode", key: "kode_marketing", className: "text-slate-500" },
    { header: "Target", render: (r) => <span className="font-mono text-slate-600">{formatRp(r.target)}</span> },
    { header: "Realisasi", render: (r) => <span className="font-mono font-semibold text-ink">{formatRp(r.realisasi)}</span> },
    { header: "Achievement", render: (r) => <span className="font-heading font-bold text-emerald-700">{r.achievement === null ? "—" : formatPct(r.achievement)}</span> },
    { header: "Status", render: (r) => <StatusBadge status={r.status} note={r.note} /> },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle sub={`Peringkat berdasarkan achievement · ${periodeLabel(periode)}`}>Ranking / Leaderboard</SectionTitle>
      <Tabs
        active={komponen}
        onChange={setKomponen}
        tabs={[
          { value: "Pembiayaan", label: "Pembiayaan" },
          { value: "Funding", label: "Funding" },
          { value: "Recovery", label: "Recovery (Kol.3)" },
          { value: "Recovery (Kol.4+5)", label: "Recovery (Kol.4+5)" },
        ]}
      />
      <Card className="p-5 sm:p-6">
        {loading || !data ? <Spinner /> : (
          <>
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm"><Trophy size={16} className="text-gold-500" /> Leaderboard {data.komponen}</div>
            <Table columns={columns} rows={data.rows} testid="leaderboard-table" empty="Belum ada peserta pada periode ini" />
          </>
        )}
      </Card>
    </div>
  );
}
