import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, PiggyBank, HandCoins, FileDown } from "lucide-react";
import { api, formatRp, periodeLabel } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { usePeriod } from "../components/Layout";
import { KpiCard, Spinner, SectionTitle, Card, Button } from "../components/ui";

const ICON = {
  "Pembiayaan": <TrendingUp className="text-emerald-600" size={20} />,
  "Funding": <PiggyBank className="text-emerald-600" size={20} />,
  "Recovery (Kol.3)": <HandCoins className="text-emerald-600" size={20} />,
};

export default function PersonalDashboard() {
  const { user } = useAuth();
  const { periode } = usePeriod();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/me?periode=${periode}`).then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, [periode]);

  if (loading || !data) return <Spinner />;

  const downloadFile = async (kind) => {
    try {
      const ext = kind === "excel" ? "xlsx" : "pdf";
      const ep = kind === "excel" ? "ao-excel" : "ao-pdf";
      const res = await api.get(`/reports/${ep}/${user.id}?periode=${periode}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `Rekap_${periode}.${ext}`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${ext.toUpperCase()} diunduh`);
    } catch (e) { toast.error("Gagal membuat file"); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl gradient-emerald grid-pattern p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="text-emerald-100/80 text-sm">Selamat datang kembali,</div>
            <h1 className="font-heading text-3xl font-extrabold mt-1">{user.nama}</h1>
            <div className="mt-2 text-emerald-50/90">{user.jabatan} · Kode {user.kode_marketing} · {periodeLabel(periode)}</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button onClick={() => downloadFile("pdf")} data-testid="download-pdf-btn" className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 text-sm font-semibold transition-colors">
              <FileDown size={16} /> PDF
            </button>
            <button onClick={() => downloadFile("excel")} data-testid="download-excel-btn" className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 text-sm font-semibold transition-colors">
              <FileDown size={16} /> Excel
            </button>
          </div>
        </div>
        <div className="absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl" />
      </div>

      <SectionTitle sub="Pencapaian Anda pada periode terpilih. Nilai dihitung otomatis dari transaksi yang diinput Admin.">Dashboard Pencapaian</SectionTitle>

      <div className={`grid grid-cols-1 ${data.kpis.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md"} gap-4 sm:gap-6`}>
        {data.kpis.map((k, i) => (
          <KpiCard key={i} label={`Achievement ${k.komponen}`} formatRp={formatRp} icon={ICON[k.komponen]} {...k} />
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="font-heading font-semibold mb-2">Catatan</h3>
        <p className="text-sm text-slate-500">Performance Score = Achievement (%). Insentif hanya tampil setelah disetujui Direktur di menu <b>Insentif</b>. Riwayat performa bulanan sejak Januari 2026 tersedia di menu <b>Riwayat Performance</b>.</p>
      </Card>
    </div>
  );
}
