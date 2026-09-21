import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Target as TargetIcon, Save } from "lucide-react";
import { api, apiError, formatRp, periodeLabel } from "../../lib/api";
import { usePeriod } from "../../components/Layout";
import { Card, Spinner, SectionTitle, Table, Pill, Button, Input } from "../../components/ui";

export default function Targets() {
  const { periode } = usePeriod();
  const [users, setUsers] = useState([]);
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState({});

  const load = async () => {
    setLoading(true);
    const [u, t] = await Promise.all([api.get("/users"), api.get(`/targets?periode=${periode}`)]);
    setUsers(u.data.filter((x) => ["AO Pembiayaan", "AO Funding", "Collection & Remedial"].includes(x.jabatan)));
    const map = {}; t.data.forEach((x) => (map[x.ao_id] = x));
    setTargets(map); setEdit({}); setLoading(false);
  };
  useEffect(() => { load(); }, [periode]);

  const save = async (u) => {
    const cur = edit[u.id] || {};
    const t = targets[u.id] || {};
    const body = {
      ao_id: u.id, periode,
      target_pencairan: parseFloat(cur.target_pencairan ?? t.target_pencairan ?? 0) || 0,
      target_funding: parseFloat(cur.target_funding ?? t.target_funding ?? 0) || 0,
      target_recovery: parseFloat(cur.target_recovery ?? t.target_recovery ?? 0) || 0,
      target_recovery_kol45: parseFloat(cur.target_recovery_kol45 ?? t.target_recovery_kol45 ?? 0) || 0,
    };
    try { await api.post("/targets", body); toast.success(`Target ${u.nama} disimpan`); load(); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  const field = (u, key) => {
    const val = edit[u.id]?.[key] ?? targets[u.id]?.[key] ?? "";
    return <Input type="number" value={val} onChange={(e) => setEdit((s) => ({ ...s, [u.id]: { ...s[u.id], [key]: e.target.value } }))} data-testid={`target-${key}-${u.kode_marketing}`} className="w-40" />;
  };

  const columns = [
    { header: "AO", render: (u) => <div><div className="font-semibold text-sm">{u.nama}</div><div className="text-xs text-slate-400">{u.kode_marketing} · {u.jabatan}</div></div> },
    { header: "Target Pembiayaan", render: (u) => (u.jabatan === "AO Pembiayaan" ? field(u, "target_pencairan") : <span className="text-slate-300">—</span>) },
    { header: "Target Funding", render: (u) => (["AO Pembiayaan", "AO Funding"].includes(u.jabatan) ? field(u, "target_funding") : <span className="text-slate-300">—</span>) },
    { header: "Target Recovery (Kol.3)", render: (u) => (u.jabatan === "Collection & Remedial" ? field(u, "target_recovery") : <span className="text-slate-300">—</span>) },
    { header: "Target Recovery (Kol.4+5)", render: (u) => (u.jabatan === "Collection & Remedial" ? field(u, "target_recovery_kol45") : <span className="text-slate-300">—</span>) },
    { header: "", render: (u) => <Button size="sm" onClick={() => save(u)} data-testid={`save-target-${u.kode_marketing}`}><Save size={14} /> Simpan</Button> },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle sub={`Set & edit target per AO · ${periodeLabel(periode)}`}>Target Management</SectionTitle>
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-slate-600 mb-4"><TargetIcon size={18} className="text-emerald-600" /> Target Periode {periodeLabel(periode)}</div>
        {loading ? <Spinner /> : <Table columns={columns} rows={users} testid="targets-table" />}
      </Card>
    </div>
  );
}
