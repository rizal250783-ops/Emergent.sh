import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Check, X, UserPlus, UserMinus, Trash2 } from "lucide-react";
import { api, apiError, formatRp, formatPct, periodeLabel } from "../lib/api";
import { Card, Spinner, SectionTitle, Table, Pill, Button, Tabs } from "../components/ui";

export default function Approval() {
  const [tab, setTab] = useState("insentif");
  return (
    <div className="space-y-6">
      <SectionTitle sub="Persetujuan insentif & perubahan user oleh Direktur">Approval Center</SectionTitle>
      <Tabs active={tab} onChange={setTab} tabs={[{ value: "insentif", label: "Approval Insentif" }, { value: "user", label: "Approval User Management" }]} />
      {tab === "insentif" ? <ApprovalInsentif /> : <ApprovalUser />}
    </div>
  );
}

function ApprovalInsentif() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState([]);

  const load = () => {
    setLoading(true);
    api.get("/incentives?status=pending").then(({ data }) => setRows(data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const decide = async (ids, action, reason) => {
    try {
      await api.post("/incentives/approve", { ids, action, reason });
      toast.success(action === "approve" ? "Insentif disetujui" : "Insentif ditolak");
      setSel([]);
      load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const columns = [
    { header: "", render: (r) => <input type="checkbox" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} data-testid={`inc-check-${r.id}`} className="h-4 w-4 accent-emerald-600" />, className: "w-8" },
    { header: "Nama", render: (r) => <div><div className="font-semibold text-sm">{r.nama}</div><div className="text-xs text-slate-400">{r.jabatan} · {r.kode_marketing}</div></div> },
    { header: "Periode", render: (r) => periodeLabel(r.periode) },
    { header: "Kategori", render: (r) => <Pill tone="gold">{r.kategori_label}</Pill> },
    { header: "Dasar", render: (r) => <span className="font-mono text-xs text-slate-500">{r.base_perhitungan ? formatRp(r.base_perhitungan) : "—"}</span> },
    { header: "Persen", render: (r) => (r.nilai_persen != null ? formatPct(r.nilai_persen) : "Manual") },
    { header: "Nominal", render: (r) => <span className="font-mono font-bold text-emerald-700">{formatRp(r.nominal_terhitung)}</span> },
    { header: "Aksi", render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" onClick={() => decide([r.id], "approve")} data-testid={`approve-inc-${r.id}`}><Check size={14} /></Button>
          <Button size="sm" variant="danger" onClick={() => decide([r.id], "reject", "Ditolak Direktur")} data-testid={`reject-inc-${r.id}`}><X size={14} /></Button>
        </div>
      ) },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-600"><ShieldCheck size={18} className="text-emerald-600" /> Insentif Menunggu Persetujuan</div>
        {sel.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => decide(sel, "approve")} data-testid="bulk-approve-inc"><Check size={14} /> Approve {sel.length}</Button>
            <Button size="sm" variant="danger" onClick={() => decide(sel, "reject", "Ditolak massal")} data-testid="bulk-reject-inc"><X size={14} /> Reject</Button>
          </div>
        )}
      </div>
      {loading ? <Spinner /> : <Table columns={columns} rows={rows} testid="approval-insentif-table" empty="Tidak ada insentif menunggu persetujuan" />}
    </Card>
  );
}

function ApprovalUser() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/user-requests?status=pending").then(({ data }) => setRows(data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const decide = async (id, action) => {
    try {
      await api.post(`/user-requests/${id}/decide`, { action, reason: action === "reject" ? "Ditolak Direktur" : null });
      toast.success(action === "approve" ? "Request disetujui & diterapkan" : "Request ditolak");
      load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  const ICON = { tambah: <UserPlus size={14} />, nonaktifkan: <UserMinus size={14} />, hapus: <Trash2 size={14} /> };
  const TONE = { tambah: "emerald", nonaktifkan: "gold", hapus: "red" };

  const columns = [
    { header: "Aksi", render: (r) => <Pill tone={TONE[r.action_type]}><span className="flex items-center gap-1">{ICON[r.action_type]} {r.action_type}</span></Pill> },
    { header: "Target User", render: (r) => <div><div className="font-semibold text-sm">{r.target_nama || "-"}</div><div className="text-xs text-slate-400">{r.target_kode || ""}</div></div> },
    { header: "Diajukan oleh", key: "requested_by" },
    { header: "Alasan", render: (r) => <span className="text-sm text-slate-500">{r.reason || "—"}</span> },
    { header: "Keputusan", render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" onClick={() => decide(r.id, "approve")} data-testid={`approve-req-${r.id}`}><Check size={14} /> Setujui</Button>
          <Button size="sm" variant="danger" onClick={() => decide(r.id, "reject")} data-testid={`reject-req-${r.id}`}><X size={14} /></Button>
        </div>
      ) },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-slate-600 mb-4"><ShieldCheck size={18} className="text-emerald-600" /> Request User Management Menunggu Persetujuan</div>
      {loading ? <Spinner /> : <Table columns={columns} rows={rows} testid="approval-user-table" empty="Tidak ada request menunggu persetujuan" />}
    </Card>
  );
}
