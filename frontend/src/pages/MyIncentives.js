import React, { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { api, formatRp, formatPct, periodeLabel } from "../lib/api";
import { Card, Spinner, SectionTitle, Table, Pill } from "../components/ui";

export default function MyIncentives() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/incentives/mine").then(({ data }) => setRows(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const total = rows.reduce((s, r) => s + (r.nominal_terhitung || 0), 0);
  const columns = [
    { header: "Periode", render: (r) => <span className="font-semibold">{periodeLabel(r.periode)}</span> },
    { header: "Kategori", render: (r) => <Pill tone="gold">{r.kategori_label}</Pill> },
    { header: "Dasar", render: (r) => <span className="font-mono text-slate-500 text-xs">{r.base_perhitungan ? formatRp(r.base_perhitungan) : "—"}</span> },
    { header: "Persen", render: (r) => (r.nilai_persen != null ? formatPct(r.nilai_persen) : "Manual") },
    { header: "Nominal", render: (r) => <span className="font-mono font-bold text-emerald-700">{formatRp(r.nominal_terhitung)}</span> },
    { header: "Disetujui", render: (r) => <span className="text-xs text-slate-400">{r.approved_at ? r.approved_at.slice(0, 10) : "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle sub="Hanya menampilkan insentif yang sudah disetujui Direktur">Insentif Saya</SectionTitle>
      <Card className="p-6 gradient-emerald grid-pattern text-white relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center"><Gift size={26} /></div>
          <div>
            <div className="text-emerald-100/80 text-sm">Total Insentif Disetujui</div>
            <div className="font-mono font-bold text-3xl">{formatRp(total)}</div>
          </div>
        </div>
        <div className="absolute -bottom-14 -right-8 h-44 w-44 rounded-full bg-gold-500/25 blur-3xl" />
      </Card>
      <Card className="p-5 sm:p-6">
        <Table columns={columns} rows={rows} testid="my-incentives-table" empty="Belum ada insentif yang disetujui" />
      </Card>
    </div>
  );
}
