import React, { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { api } from "../lib/api";
import { Card, Spinner, SectionTitle, Table, Pill } from "../components/ui";

export default function Audit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/audit-logs?limit=400").then(({ data }) => setRows(data)).finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => !q || `${r.user_nama} ${r.aktivitas}`.toLowerCase().includes(q.toLowerCase()));

  const columns = [
    { header: "Waktu", render: (r) => <span className="font-mono text-xs text-slate-500">{r.waktu?.slice(0, 19).replace("T", " ")}</span> },
    { header: "User", render: (r) => <div><div className="font-semibold text-sm">{r.user_nama}</div><div className="text-xs text-slate-400">{r.user_kode}</div></div> },
    { header: "Aktivitas", render: (r) => <span className="text-sm">{r.aktivitas}</span> },
    { header: "Detail", render: (r) => <span className="text-xs text-slate-400 font-mono">{r.data_sesudah ? JSON.stringify(r.data_sesudah).slice(0, 60) : ""}</span> },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle sub="Semua aktivitas sistem tercatat">Audit Log</SectionTitle>
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText size={18} className="text-emerald-600" />
          <input placeholder="Cari user / aktivitas…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="audit-search" className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          <Pill tone="slate">{filtered.length} baris</Pill>
        </div>
        {loading ? <Spinner /> : <Table columns={columns} rows={filtered} testid="audit-table" />}
      </Card>
    </div>
  );
}
