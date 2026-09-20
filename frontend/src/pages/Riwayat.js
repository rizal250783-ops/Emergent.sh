import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, LineChart } from "recharts";
import { api, formatRp, formatRpShort, formatPct, periodeLabel } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { usePeriod } from "../components/Layout";
import { Card, Spinner, SectionTitle, Table, StatusBadge, Select, Button } from "../components/ui";

export default function Riwayat() {
  const { user } = useAuth();
  const { periode } = usePeriod();
  const isManager = user.jabatan === "Admin" || user.jabatan === "Direktur";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const targetId = isManager ? selected : user.id;

  const downloadFile = async (kind) => {
    if (!targetId) return;
    setPdfBusy(true);
    try {
      const ext = kind === "excel" ? "xlsx" : "pdf";
      const ep = kind === "excel" ? "ao-excel" : "ao-pdf";
      const res = await api.get(`/reports/${ep}/${targetId}?periode=${periode}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `Rekap_${periode}.${ext}`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${ext.toUpperCase()} diunduh`);
    } catch (e) { toast.error("Gagal membuat file"); }
    finally { setPdfBusy(false); }
  };

  useEffect(() => {
    if (isManager) {
      api.get("/users").then(({ data }) => {
        const aos = data.filter((u) => ["AO Pembiayaan", "AO Funding", "Collection & Remedial"].includes(u.jabatan));
        setUsers(aos);
        if (aos.length) setSelected(aos[0].id);
      });
    }
  }, [isManager]);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      const url = isManager ? (selected ? `/riwayat/user/${selected}` : null) : "/riwayat/me";
      if (!url) { setLoading(false); return; }
      api.get(url).then(({ data }) => setRows(data)).finally(() => setLoading(false));
    };
    load();
  }, [isManager, selected]);

  const chartData = rows.map((r) => ({ bulan: periodeLabel(r.bulan).split(" ")[0].slice(0, 3), Realisasi: r.realisasi, Achievement: r.achievement || 0 }));

  const columns = [
    { header: "Bulan", render: (r) => <span className="font-semibold">{periodeLabel(r.bulan)}</span> },
    { header: "Target", render: (r) => <span className="font-mono text-slate-600">{formatRp(r.target)}</span> },
    { header: "Realisasi", render: (r) => <span className="font-mono font-semibold">{formatRp(r.realisasi)}</span> },
    { header: "Achievement", render: (r) => <span className="font-heading font-bold text-emerald-700">{r.achievement === null ? (r.note || "—") : formatPct(r.achievement)}</span> },
    { header: "Status", render: (r) => <StatusBadge status={r.status} note={r.note} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <SectionTitle sub="Histori bulanan sejak Januari 2026">Riwayat Performance Bulanan</SectionTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadFile("pdf")} disabled={pdfBusy || !targetId} data-testid="download-pdf-btn"><FileDown size={16} /> PDF</Button>
          <Button variant="subtle" onClick={() => downloadFile("excel")} disabled={pdfBusy || !targetId} data-testid="download-excel-btn"><FileDown size={16} /> Excel</Button>
        </div>
      </div>

      {isManager && (
        <div className="max-w-xs">
          <Select label="Pilih AO" value={selected} onChange={(e) => setSelected(e.target.value)} data-testid="riwayat-user-select">
            {users.map((u) => <option key={u.id} value={u.id}>{u.kode_marketing} · {u.nama} ({u.jabatan})</option>)}
          </Select>
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="p-5 sm:p-6">
              <h3 className="font-heading font-semibold mb-4">Tren Realisasi (Rp)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#047857" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickFormatter={(v) => formatRpShort(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} width={70} />
                  <Tooltip formatter={(v) => formatRp(v)} />
                  <Area type="monotone" dataKey="Realisasi" stroke="#047857" strokeWidth={2.5} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="font-heading font-semibold mb-4">Tren Achievement (%)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "#94a3b8" }} width={45} />
                  <Tooltip formatter={(v) => formatPct(v)} />
                  <Line type="monotone" dataKey="Achievement" stroke="#D97706" strokeWidth={2.5} dot={{ r: 3, fill: "#D97706" }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card className="p-5 sm:p-6">
            <Table columns={columns} rows={rows} testid="riwayat-table" empty="Belum ada data riwayat" />
          </Card>
        </>
      )}
    </div>
  );
}
