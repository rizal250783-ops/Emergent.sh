import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Coins, Plus } from "lucide-react";
import { api, apiError, formatRp, formatPct, periodeLabel } from "../../lib/api";
import { usePeriod } from "../../components/Layout";
import { Card, Spinner, SectionTitle, Table, Pill, Button, Modal, Select, Input, Tabs } from "../../components/ui";

const STATUS_TONE = { pending: "gold", approved: "emerald", rejected: "red" };
const STATUS_LABEL = { pending: "Menunggu Approval", approved: "Disetujui", rejected: "Ditolak" };

export default function Incentives() {
  const { periode } = usePeriod();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);

  const load = () => {
    setLoading(true);
    const q = statusFilter ? `&status=${statusFilter}` : "";
    api.get(`/incentives?periode=${periode}${q}`).then(({ data }) => setRows(data)).finally(() => setLoading(false));
  };
  useEffect(load, [periode, statusFilter]);
  useEffect(() => { api.get("/users").then(({ data }) => setUsers(data.filter((u) => ["AO Pembiayaan", "AO Funding"].includes(u.jabatan)))); }, []);

  const columns = [
    { header: "Nama", render: (r) => <div><div className="font-semibold text-sm">{r.nama}</div><div className="text-xs text-slate-400">{r.jabatan}</div></div> },
    { header: "Periode", render: (r) => periodeLabel(r.periode) },
    { header: "Kategori", render: (r) => <Pill tone="gold">{r.kategori_label}</Pill> },
    { header: "Dasar", render: (r) => <span className="font-mono text-xs text-slate-500">{r.base_perhitungan ? formatRp(r.base_perhitungan) : "—"}</span> },
    { header: "Persen", render: (r) => (r.nilai_persen != null ? formatPct(r.nilai_persen) : "Manual") },
    { header: "Nominal", render: (r) => <span className="font-mono font-bold text-emerald-700">{formatRp(r.nominal_terhitung)}</span> },
    { header: "Status", render: (r) => <Pill tone={STATUS_TONE[r.status_approval]}>{STATUS_LABEL[r.status_approval]}</Pill> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionTitle sub="Insentif Kol.3/4/5 & WO otomatis; insentif target diajukan manual">Perhitungan Insentif</SectionTitle>
        <Button onClick={() => setOpen(true)} data-testid="add-target-incentive-btn"><Plus size={16} /> Ajukan Insentif Target</Button>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-slate-600"><Coins size={18} className="text-gold-600" /> Semua Insentif</div>
          <div className="w-52">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="incentive-status-filter">
              <option value="">Semua Status</option>
              <option value="pending">Menunggu Approval</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </Select>
          </div>
        </div>
        {loading ? <Spinner /> : <Table columns={columns} rows={rows} testid="incentives-admin-table" empty="Belum ada insentif" />}
      </Card>

      {open && <TargetIncentiveModal users={users} periode={periode} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function TargetIncentiveModal({ users, periode, onClose, onDone }) {
  const [f, setF] = useState({ ao_id: users[0]?.id || "", kategori: "target_pembiayaan", jenis_perhitungan: "persentase", nilai_persen: "", nilai_manual: "" });
  const submit = async () => {
    try {
      await api.post("/incentives/target", {
        ao_id: f.ao_id, periode, kategori: f.kategori, jenis_perhitungan: f.jenis_perhitungan,
        nilai_persen: f.jenis_perhitungan === "persentase" ? parseFloat(f.nilai_persen) || 0 : null,
        nilai_manual: f.jenis_perhitungan === "manual" ? parseFloat(f.nilai_manual) || 0 : null,
      });
      toast.success("Insentif diajukan ke Direktur");
      onDone();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  return (
    <Modal open onClose={onClose} title="Ajukan Insentif Pencapaian Target">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Hanya untuk komponen dengan achievement ≥100%. Persentase dihitung dari total realisasi.</p>
        <Select label="AO" value={f.ao_id} onChange={(e) => setF({ ...f, ao_id: e.target.value })} data-testid="ti-ao">{users.map((u) => <option key={u.id} value={u.id}>{u.kode_marketing} · {u.nama} ({u.jabatan})</option>)}</Select>
        <Select label="Kategori" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })} data-testid="ti-kategori"><option value="target_pembiayaan">Target Pembiayaan</option><option value="target_funding">Target Funding</option></Select>
        <Select label="Jenis Perhitungan" value={f.jenis_perhitungan} onChange={(e) => setF({ ...f, jenis_perhitungan: e.target.value })} data-testid="ti-jenis"><option value="persentase">Persentase (%)</option><option value="manual">Manual (Rupiah)</option></Select>
        {f.jenis_perhitungan === "persentase"
          ? <Input label="Persentase (%)" type="number" value={f.nilai_persen} onChange={(e) => setF({ ...f, nilai_persen: e.target.value })} data-testid="ti-persen" />
          : <Input label="Nominal Manual (Rp)" type="number" value={f.nilai_manual} onChange={(e) => setF({ ...f, nilai_manual: e.target.value })} data-testid="ti-manual" />}
        <Button className="w-full" onClick={submit} data-testid="ti-submit">Ajukan ke Direktur</Button>
      </div>
    </Modal>
  );
}
