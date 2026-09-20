import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, PiggyBank, HandCoins, Users2, Clock, Trophy, FileDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { api, formatRp, formatRpShort, formatPct, periodeLabel } from "../lib/api";
import { usePeriod } from "../components/Layout";
import { Card, KpiCard, Spinner, SectionTitle, Table, StatusBadge, Pill, Button } from "../components/ui";

export default function ExecutiveDashboard() {
  const { periode } = usePeriod();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/executive?periode=${periode}`).then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, [periode]);

  const downloadTeamPdf = async () => {
    setPdfBusy(true);
    try {
      const res = await api.get(`/reports/team-pdf?periode=${periode}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `Laporan_Tim_${periode}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan Tim PDF diunduh");
    } catch (e) { toast.error("Gagal membuat PDF"); }
    finally { setPdfBusy(false); }
  };

  if (loading || !data) return <Spinner />;

  const bars = [
    { name: "Pembiayaan", Target: data.pembiayaan.target, Realisasi: data.pembiayaan.realisasi },
    { name: "Funding", Target: data.funding.target, Realisasi: data.funding.realisasi },
    { name: "Recovery", Target: data.recovery.target, Realisasi: data.recovery.realisasi },
  ];

  const lbCols = [
    { header: "#", render: (r, i) => <span className="font-bold text-slate-400">{r.ranking || i + 1}</span>, className: "w-10" },
    { header: "Nama", render: (r) => <div><div className="font-semibold text-ink">{r.nama}</div><div className="text-xs text-slate-400">{r.kode_marketing}</div></div> },
    { header: "Realisasi", render: (r) => <span className="font-mono">{formatRpShort(r.realisasi)}</span> },
    { header: "Ach.", render: (r) => <StatusBadge status={r.status} note={r.note} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionTitle sub={`Ringkasan bank-wide · ${periodeLabel(periode)}`}>Executive Dashboard</SectionTitle>
        <Button variant="outline" onClick={downloadTeamPdf} disabled={pdfBusy} data-testid="team-pdf-btn"><FileDown size={16} /> {pdfBusy ? "Menyiapkan…" : "Laporan Tim PDF"}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <KpiCard label="Total Pembiayaan" formatRp={formatRp} icon={<TrendingUp className="text-emerald-600" size={20} />} {...data.pembiayaan} />
        <KpiCard label="Total Funding (DPK)" formatRp={formatRp} icon={<PiggyBank className="text-emerald-600" size={20} />} {...data.funding} />
        <KpiCard label="Recovery Kol.3" formatRp={formatRp} icon={<HandCoins className="text-emerald-600" size={20} />} {...data.recovery} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2"><Users2 size={14} /> AO Pembiayaan</div><div className="mt-2 font-heading text-3xl font-bold text-ink">{data.jumlah_ao["AO Pembiayaan"]}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2"><Users2 size={14} /> AO Funding</div><div className="mt-2 font-heading text-3xl font-bold text-ink">{data.jumlah_ao["AO Funding"]}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2"><Clock size={14} /> Insentif Pending</div><div className="mt-2 font-heading text-3xl font-bold text-gold-600">{data.pending_insentif}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2"><Clock size={14} /> Request User</div><div className="mt-2 font-heading text-3xl font-bold text-gold-600">{data.pending_user_request}</div></Card>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="font-heading text-lg font-semibold mb-4">Target vs Realisasi</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tickFormatter={(v) => formatRpShort(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} width={80} />
            <Tooltip formatter={(v) => formatRp(v)} />
            <Legend />
            <Bar dataKey="Target" fill="#FBBF24" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Realisasi" fill="#047857" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-5"><h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Trophy size={16} className="text-gold-500" /> Top Pembiayaan</h3><Table columns={lbCols} rows={data.top_pembiayaan} testid="top-pembiayaan" /></Card>
        <Card className="p-5"><h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Trophy size={16} className="text-gold-500" /> Top Funding</h3><Table columns={lbCols} rows={data.top_funding} testid="top-funding" /></Card>
        <Card className="p-5"><h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Trophy size={16} className="text-gold-500" /> Top Recovery</h3><Table columns={lbCols} rows={data.top_recovery} testid="top-recovery" /></Card>
      </div>
    </div>
  );
}
