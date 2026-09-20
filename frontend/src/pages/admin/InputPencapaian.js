import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api, apiError, formatRp } from "../../lib/api";
import { usePeriod } from "../../components/Layout";
import { Card, Spinner, SectionTitle, Table, Pill, Button, Modal, Input, Select, Tabs } from "../../components/ui";

export default function InputPencapaian() {
  const { periode } = usePeriod();
  const [tab, setTab] = useState("pembiayaan");
  const [users, setUsers] = useState([]);
  const [akad, setAkad] = useState([]);
  const [simpanan, setSimpanan] = useState([]);

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(data));
    api.get("/meta/constants").then(({ data }) => { setAkad(data.jenis_akad); setSimpanan(data.jenis_simpanan); });
  }, []);

  const pembiayaanAO = users.filter((u) => u.jabatan === "AO Pembiayaan");
  const fundingAO = users.filter((u) => ["AO Funding", "AO Pembiayaan"].includes(u.jabatan));
  const collectionPIC = users.filter((u) => ["Collection & Remedial", "AO Pembiayaan"].includes(u.jabatan));

  return (
    <div className="space-y-6">
      <SectionTitle sub="Input transaksi per nasabah — achievement dihitung otomatis">Input Pencapaian</SectionTitle>
      <Tabs active={tab} onChange={setTab} tabs={[
        { value: "pembiayaan", label: "Transaksi Pembiayaan" },
        { value: "funding", label: "Transaksi Funding" },
        { value: "recovery", label: "Transaksi Recovery" },
      ]} />
      {tab === "pembiayaan" && <LendingTab periode={periode} aos={pembiayaanAO} akad={akad} />}
      {tab === "funding" && <FundingTab periode={periode} aos={fundingAO} simpanan={simpanan} />}
      {tab === "recovery" && <RecoveryTab periode={periode} pics={collectionPIC} />}
    </div>
  );
}

function nameOf(aos, id) { const u = aos.find((x) => x.id === id); return u ? `${u.kode_marketing} · ${u.nama}` : id; }

function LendingTab({ periode, aos, akad }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nomor_kontrak: "", jenis_akad: "Murabahah", nama_nasabah: "", jumlah_pencairan: "", tanggal_pencairan: `${periode}-01`, ao_id: "" });
  const load = () => { setLoading(true); api.get(`/transactions/lending?periode=${periode}`).then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(load, [periode]);
  useEffect(() => { if (aos.length && !f.ao_id) setF((s) => ({ ...s, ao_id: aos[0].id })); }, [aos]);

  const submit = async () => {
    try { await api.post("/transactions/lending", { ...f, jumlah_pencairan: parseFloat(f.jumlah_pencairan) || 0 }); toast.success("Transaksi tersimpan"); setOpen(false); load(); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if (!window.confirm("Hapus transaksi ini?")) return; await api.delete(`/transactions/lending/${id}`); toast.success("Dihapus"); load(); };

  const columns = [
    { header: "No. Kontrak", key: "nomor_kontrak", className: "font-mono text-xs" },
    { header: "Akad", render: (r) => <Pill tone="emerald">{r.jenis_akad}</Pill> },
    { header: "Nasabah", key: "nama_nasabah" },
    { header: "Pencairan", render: (r) => <span className="font-mono font-semibold">{formatRp(r.jumlah_pencairan)}</span> },
    { header: "AO", render: (r) => <span className="text-xs">{nameOf(aos, r.ao_id)}</span> },
    { header: "Tgl", key: "tanggal_pencairan", className: "text-xs" },
    { header: "", render: (r) => <button onClick={() => del(r.id)} className="text-red-500 hover:text-red-700" data-testid={`del-lending-${r.id}`}><Trash2 size={16} /></button> },
  ];
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex justify-end mb-4"><Button onClick={() => setOpen(true)} data-testid="add-lending-btn"><Plus size={16} /> Tambah Transaksi</Button></div>
      {loading ? <Spinner /> : <Table columns={columns} rows={rows} testid="lending-table" />}
      <Modal open={open} onClose={() => setOpen(false)} title="Transaksi Pencairan Pembiayaan">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nomor Kontrak" value={f.nomor_kontrak} onChange={(e) => setF({ ...f, nomor_kontrak: e.target.value })} data-testid="lending-kontrak" />
          <Select label="Jenis Akad" value={f.jenis_akad} onChange={(e) => setF({ ...f, jenis_akad: e.target.value })} data-testid="lending-akad">{akad.map((a) => <option key={a}>{a}</option>)}</Select>
          <Input label="Nama Nasabah" value={f.nama_nasabah} onChange={(e) => setF({ ...f, nama_nasabah: e.target.value })} data-testid="lending-nasabah" />
          <Input label="Jumlah Pencairan (Rp)" type="number" value={f.jumlah_pencairan} onChange={(e) => setF({ ...f, jumlah_pencairan: e.target.value })} data-testid="lending-jumlah" />
          <Input label="Tanggal Pencairan" type="date" value={f.tanggal_pencairan} onChange={(e) => setF({ ...f, tanggal_pencairan: e.target.value })} data-testid="lending-tanggal" />
          <Select label="AO Pembiayaan" value={f.ao_id} onChange={(e) => setF({ ...f, ao_id: e.target.value })} data-testid="lending-ao">{aos.map((u) => <option key={u.id} value={u.id}>{u.kode_marketing} · {u.nama}</option>)}</Select>
        </div>
        <Button className="w-full mt-5" onClick={submit} data-testid="lending-submit">Simpan Transaksi</Button>
      </Modal>
    </Card>
  );
}

function FundingTab({ periode, aos, simpanan }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nama_nasabah: "", jenis_simpanan: "Tabungan", jumlah_simpanan: "", tanggal: `${periode}-01`, ao_id: "" });
  const load = () => { setLoading(true); api.get(`/transactions/funding?periode=${periode}`).then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(load, [periode]);
  useEffect(() => { if (aos.length && !f.ao_id) setF((s) => ({ ...s, ao_id: aos[0].id })); }, [aos]);

  const submit = async () => {
    try { await api.post("/transactions/funding", { ...f, jumlah_simpanan: parseFloat(f.jumlah_simpanan) || 0 }); toast.success("Transaksi tersimpan"); setOpen(false); load(); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if (!window.confirm("Hapus?")) return; await api.delete(`/transactions/funding/${id}`); toast.success("Dihapus"); load(); };

  const columns = [
    { header: "Nasabah", key: "nama_nasabah" },
    { header: "Jenis", render: (r) => <Pill tone="blue">{r.jenis_simpanan}</Pill> },
    { header: "Jumlah", render: (r) => <span className="font-mono font-semibold">{formatRp(r.jumlah_simpanan)}</span> },
    { header: "AO", render: (r) => <span className="text-xs">{nameOf(aos, r.ao_id)}</span> },
    { header: "Tgl", key: "tanggal", className: "text-xs" },
    { header: "", render: (r) => <button onClick={() => del(r.id)} className="text-red-500 hover:text-red-700" data-testid={`del-funding-${r.id}`}><Trash2 size={16} /></button> },
  ];
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex justify-end mb-4"><Button onClick={() => setOpen(true)} data-testid="add-funding-btn"><Plus size={16} /> Tambah Transaksi</Button></div>
      {loading ? <Spinner /> : <Table columns={columns} rows={rows} testid="funding-table" />}
      <Modal open={open} onClose={() => setOpen(false)} title="Transaksi Simpanan (Funding)">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nama Nasabah" value={f.nama_nasabah} onChange={(e) => setF({ ...f, nama_nasabah: e.target.value })} data-testid="funding-nasabah" />
          <Select label="Jenis Simpanan" value={f.jenis_simpanan} onChange={(e) => setF({ ...f, jenis_simpanan: e.target.value })} data-testid="funding-jenis">{simpanan.map((s) => <option key={s}>{s}</option>)}</Select>
          <Input label="Jumlah Simpanan (Rp)" type="number" value={f.jumlah_simpanan} onChange={(e) => setF({ ...f, jumlah_simpanan: e.target.value })} data-testid="funding-jumlah" />
          <Input label="Tanggal" type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} data-testid="funding-tanggal" />
          <Select label="AO Pemilik" value={f.ao_id} onChange={(e) => setF({ ...f, ao_id: e.target.value })} data-testid="funding-ao">{aos.map((u) => <option key={u.id} value={u.id}>{u.kode_marketing} · {u.nama} ({u.jabatan})</option>)}</Select>
        </div>
        <Button className="w-full mt-5" onClick={submit} data-testid="funding-submit">Simpan Transaksi</Button>
      </Modal>
    </Card>
  );
}

function RecoveryTab({ periode, pics }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nomor_kontrak: "", nama_nasabah: "", jumlah_recovery: "", tanggal: `${periode}-01`, kolektibilitas: 3, denda_dibayar_penuh: false, is_write_off: false, pic_id: "" });
  const load = () => { setLoading(true); api.get(`/transactions/recovery?periode=${periode}`).then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(load, [periode]);
  useEffect(() => { if (pics.length && !f.pic_id) setF((s) => ({ ...s, pic_id: pics[0].id })); }, [pics]);

  const submit = async () => {
    try {
      await api.post("/transactions/recovery", { ...f, kolektibilitas: parseInt(f.kolektibilitas), jumlah_recovery: parseFloat(f.jumlah_recovery) || 0, denda_dibayar_penuh: (f.kolektibilitas == 4 || f.kolektibilitas == 5) && !f.is_write_off ? f.denda_dibayar_penuh : null });
      toast.success("Transaksi tersimpan · insentif dihitung otomatis"); setOpen(false); load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const del = async (id) => { if (!window.confirm("Hapus?")) return; await api.delete(`/transactions/recovery/${id}`); toast.success("Dihapus"); load(); };

  const columns = [
    { header: "No. Kontrak", key: "nomor_kontrak", className: "font-mono text-xs" },
    { header: "Nasabah", key: "nama_nasabah" },
    { header: "Cash-in", render: (r) => <span className="font-mono font-semibold">{formatRp(r.jumlah_recovery)}</span> },
    { header: "Kol.", render: (r) => <Pill tone={r.kolektibilitas === 3 ? "emerald" : r.kolektibilitas === 4 ? "gold" : "red"}>Kol. {r.kolektibilitas}</Pill> },
    { header: "Denda", render: (r) => (r.kolektibilitas > 3 && !r.is_write_off ? (r.denda_dibayar_penuh ? "Penuh" : "Tidak") : "—") },
    { header: "WO", render: (r) => (r.is_write_off ? <Pill tone="red">WO</Pill> : "—") },
    { header: "PIC", render: (r) => <span className="text-xs">{nameOf(pics, r.pic_id)}</span> },
    { header: "", render: (r) => <button onClick={() => del(r.id)} className="text-red-500 hover:text-red-700" data-testid={`del-recovery-${r.id}`}><Trash2 size={16} /></button> },
  ];
  const showDenda = (f.kolektibilitas == 4 || f.kolektibilitas == 5) && !f.is_write_off;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-slate-500 max-w-md">Hanya Kol.3 masuk achievement. Kol.4/5 & WO otomatis jadi dasar insentif (menunggu approval Direktur).</p>
        <Button onClick={() => setOpen(true)} data-testid="add-recovery-btn"><Plus size={16} /> Tambah Transaksi</Button>
      </div>
      {loading ? <Spinner /> : <Table columns={columns} rows={rows} testid="recovery-table" />}
      <Modal open={open} onClose={() => setOpen(false)} title="Transaksi Recovery / Cash-in">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nomor Kontrak" value={f.nomor_kontrak} onChange={(e) => setF({ ...f, nomor_kontrak: e.target.value })} data-testid="recovery-kontrak" />
          <Input label="Nama Nasabah" value={f.nama_nasabah} onChange={(e) => setF({ ...f, nama_nasabah: e.target.value })} data-testid="recovery-nasabah" />
          <Input label="Jumlah Cash-in (Rp)" type="number" value={f.jumlah_recovery} onChange={(e) => setF({ ...f, jumlah_recovery: e.target.value })} data-testid="recovery-jumlah" />
          <Input label="Tanggal" type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} data-testid="recovery-tanggal" />
          <Select label="Kolektibilitas" value={f.kolektibilitas} onChange={(e) => setF({ ...f, kolektibilitas: e.target.value })} data-testid="recovery-kol"><option value={3}>Kolektibilitas 3</option><option value={4}>Kolektibilitas 4</option><option value={5}>Kolektibilitas 5</option></Select>
          <Select label="PIC Pemilik" value={f.pic_id} onChange={(e) => setF({ ...f, pic_id: e.target.value })} data-testid="recovery-pic">{pics.map((u) => <option key={u.id} value={u.id}>{u.kode_marketing} · {u.nama} ({u.jabatan})</option>)}</Select>
          {showDenda && (
            <Select label="Denda Dibayar Penuh?" value={f.denda_dibayar_penuh ? "1" : "0"} onChange={(e) => setF({ ...f, denda_dibayar_penuh: e.target.value === "1" })} data-testid="recovery-denda"><option value="1">Ya</option><option value="0">Tidak</option></Select>
          )}
          <Select label="Status Write Off?" value={f.is_write_off ? "1" : "0"} onChange={(e) => setF({ ...f, is_write_off: e.target.value === "1" })} data-testid="recovery-wo"><option value="0">Tidak</option><option value="1">Ya (Write Off)</option></Select>
        </div>
        <Button className="w-full mt-5" onClick={submit} data-testid="recovery-submit">Simpan Transaksi</Button>
      </Modal>
    </Card>
  );
}
