import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users2, Plus, UserMinus, Trash2, KeyRound, Pencil, UserCheck } from "lucide-react";
import { api, apiError } from "../../lib/api";
import { Card, Spinner, SectionTitle, Table, Pill, Button, Modal, Input, Select } from "../../components/ui";

const ROLES = ["Direktur", "Admin", "AO Pembiayaan", "AO Funding", "Collection & Remedial"];

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const load = () => { setLoading(true); api.get("/users").then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const requestAction = async (endpoint, body, msg) => {
    try { await api.post(endpoint, body); toast.success(msg); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  const resetPw = async (u) => {
    try { const { data } = await api.post("/users/reset-password", { target_user_id: u.id }); toast.success(`Password sementara: ${data.temporary_password}`, { duration: 8000 }); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  const columns = [
    { header: "Kode", key: "kode_marketing", className: "font-mono" },
    { header: "Nama", render: (u) => <span className="font-semibold text-sm">{u.nama}</span> },
    { header: "Jabatan", render: (u) => <Pill tone="emerald">{u.jabatan}</Pill> },
    { header: "Status", render: (u) => <Pill tone={u.status === "aktif" ? "emerald" : "red"}>{u.status}</Pill> },
    { header: "Aksi", render: (u) => (
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="subtle" onClick={() => setEditUser(u)} data-testid={`edit-user-${u.kode_marketing}`}><Pencil size={13} /></Button>
          <Button size="sm" variant="subtle" onClick={() => resetPw(u)} data-testid={`reset-pw-${u.kode_marketing}`}><KeyRound size={13} /></Button>
          {u.status === "aktif"
            ? <Button size="sm" variant="outline" onClick={() => requestAction("/users/request-deactivate", { target_user_id: u.id }, "Request nonaktif menunggu Direktur")} data-testid={`deactivate-${u.kode_marketing}`}><UserMinus size={13} /></Button>
            : <Button size="sm" onClick={async () => { await api.post(`/users/activate/${u.id}`); toast.success("Diaktifkan"); load(); }} data-testid={`activate-${u.kode_marketing}`}><UserCheck size={13} /></Button>}
          <Button size="sm" variant="danger" onClick={() => requestAction("/users/request-delete", { target_user_id: u.id }, "Request hapus menunggu Direktur")} data-testid={`delete-${u.kode_marketing}`}><Trash2 size={13} /></Button>
        </div>
      ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionTitle sub="Tambah/hapus/nonaktifkan wajib approval Direktur">User Management</SectionTitle>
        <Button onClick={() => setAddOpen(true)} data-testid="add-user-btn"><Plus size={16} /> Tambah User</Button>
      </div>
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-slate-600 mb-4"><Users2 size={18} className="text-emerald-600" /> Daftar User</div>
        {loading ? <Spinner /> : <Table columns={columns} rows={rows} testid="users-table" />}
      </Card>

      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onDone={() => setAddOpen(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onDone={() => { setEditUser(null); load(); }} />}
    </div>
  );
}

function AddUserModal({ onClose, onDone }) {
  const [f, setF] = useState({ kode_marketing: "", nama: "", jabatan: "AO Pembiayaan", reason: "" });
  const submit = async () => {
    try { await api.post("/users/request-add", f); toast.success("Request tambah user menunggu approval Direktur"); onDone(); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  return (
    <Modal open onClose={onClose} title="Tambah User (Perlu Approval Direktur)">
      <div className="space-y-4">
        <Input label="Kode Marketing" value={f.kode_marketing} onChange={(e) => setF({ ...f, kode_marketing: e.target.value })} data-testid="new-user-kode" />
        <Input label="Nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} data-testid="new-user-nama" />
        <Select label="Jabatan" value={f.jabatan} onChange={(e) => setF({ ...f, jabatan: e.target.value })} data-testid="new-user-jabatan">{ROLES.map((r) => <option key={r}>{r}</option>)}</Select>
        <Input label="Alasan (opsional)" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} data-testid="new-user-reason" />
        <Button className="w-full" onClick={submit} data-testid="new-user-submit">Ajukan ke Direktur</Button>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onDone }) {
  const [f, setF] = useState({ nama: user.nama, jabatan: user.jabatan });
  const submit = async () => {
    try { await api.put(`/users/${user.id}`, f); toast.success("User diperbarui"); onDone(); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  return (
    <Modal open onClose={onClose} title="Edit User (Tanpa Approval)" size="sm">
      <div className="space-y-4">
        <Input label="Nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} data-testid="edit-user-nama" />
        <Select label="Jabatan" value={f.jabatan} onChange={(e) => setF({ ...f, jabatan: e.target.value })} data-testid="edit-user-jabatan">{ROLES.map((r) => <option key={r}>{r}</option>)}</Select>
        <p className="text-xs text-slate-400">Perpindahan jabatan tersimpan sebagai histori.</p>
        <Button className="w-full" onClick={submit} data-testid="edit-user-submit">Simpan</Button>
      </div>
    </Modal>
  );
}
