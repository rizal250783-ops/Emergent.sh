import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { MapPin, Plus, Camera, ExternalLink, CheckCircle2 } from "lucide-react";
import { api, apiError, API, formatRp, currentPeriode } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { usePeriod } from "../components/Layout";
import { Card, Spinner, SectionTitle, Table, Pill, Button, Modal, Input, Select } from "../components/ui";

const STATUS_OPTS = ["Dikunjungi", "Berkomunikasi", "Janji Bayar", "Pembayaran Masuk", "Tidak Ditemui", "Restrukturisasi", "Eskalasi"];

export default function Collection() {
  const { user } = useAuth();
  const { periode } = usePeriod();
  const isAdmin = user.jabatan === "Admin";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selfOpen, setSelfOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(null);
  const [photoOpen, setPhotoOpen] = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/collection?periode=${periode}`).then(({ data }) => setRows(data)).finally(() => setLoading(false));
  };
  useEffect(load, [periode]);
  useEffect(() => {
    if (isAdmin) api.get("/users").then(({ data }) => setUsers(data.filter((u) => ["AO Pembiayaan", "Collection & Remedial"].includes(u.jabatan))));
  }, [isAdmin]);

  const columns = [
    { header: "No. Kontrak", key: "nomor_kontrak", className: "font-mono text-xs" },
    { header: "Nasabah", render: (r) => <div><div className="font-semibold text-sm">{r.nama_nasabah}</div><div className="text-xs text-slate-400">{formatRp(r.outstanding_pokok)}</div></div> },
    { header: "Sumber", render: (r) => <Pill tone={r.source === "admin_assigned" ? "gold" : "emerald"}>{r.source === "admin_assigned" ? "Ditugaskan" : "Mandiri"}</Pill> },
    { header: "PIC", render: (r) => <span className="text-sm">{r.assigned_to_nama || "-"}</span> },
    { header: "Status", render: (r) => (r.status_penagihan ? <Pill tone="blue">{r.status_penagihan}</Pill> : <Pill tone="slate">{r.status_kunjungan}</Pill>) },
    { header: "Foto", render: (r) => <span className="text-xs text-slate-500">{r.photos?.length || 0} foto</span> },
    { header: "Aksi", render: (r) => (
        <div className="flex gap-1 flex-wrap">
          {!isAdmin && (r.status_kunjungan !== "Selesai" || r.source === "self_input") && (
            <Button size="sm" variant="outline" onClick={() => setStatusOpen(r)} data-testid={`status-btn-${r.id}`}><CheckCircle2 size={13} /> Status</Button>
          )}
          {!isAdmin && (
            <Button size="sm" variant="subtle" onClick={() => setPhotoOpen(r)} data-testid={`photo-btn-${r.id}`}><Camera size={13} /> Foto</Button>
          )}
          {isAdmin && r.photos?.length > 0 && (
            <Button size="sm" variant="subtle" onClick={() => setPhotoOpen(r)}><Camera size={13} /> Lihat</Button>
          )}
        </div>
      ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionTitle sub="Dokumentasi kunjungan penagihan lapangan">Collection Activity</SectionTitle>
        <div className="flex gap-2">
          {isAdmin && <Button onClick={() => setAssignOpen(true)} data-testid="assign-activity-btn"><Plus size={16} /> Tugaskan</Button>}
          {!isAdmin && <Button onClick={() => setSelfOpen(true)} data-testid="self-input-btn"><Plus size={16} /> Input Mandiri</Button>}
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-slate-600 mb-4"><MapPin size={18} className="text-emerald-600" /> Daftar Aktivitas</div>
        {loading ? <Spinner /> : <Table columns={columns} rows={rows} testid="collection-table" empty="Belum ada aktivitas" />}
      </Card>

      {assignOpen && <AssignModal users={users} onClose={() => setAssignOpen(false)} onDone={() => { setAssignOpen(false); load(); }} periode={periode} />}
      {selfOpen && <SelfModal onClose={() => setSelfOpen(false)} onDone={() => { setSelfOpen(false); load(); }} periode={periode} />}
      {statusOpen && <StatusModal activity={statusOpen} onClose={() => setStatusOpen(null)} onDone={() => { setStatusOpen(null); load(); }} />}
      {photoOpen && <PhotoModal activity={photoOpen} readOnly={isAdmin} onClose={() => setPhotoOpen(null)} onDone={load} />}
    </div>
  );
}

function AssignModal({ users, onClose, onDone, periode }) {
  const [f, setF] = useState({ nomor_kontrak: "", nama_nasabah: "", outstanding_pokok: "", assigned_to: users[0]?.id || "" });
  const submit = async () => {
    try {
      await api.post("/collection/assign", { ...f, outstanding_pokok: parseFloat(f.outstanding_pokok) || 0, periode });
      toast.success("Tugas dibuat");
      onDone();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  return (
    <Modal open onClose={onClose} title="Tugaskan Collection Activity">
      <div className="space-y-4">
        <Input label="Nomor Kontrak" value={f.nomor_kontrak} onChange={(e) => setF({ ...f, nomor_kontrak: e.target.value })} data-testid="assign-kontrak" />
        <Input label="Nama Nasabah" value={f.nama_nasabah} onChange={(e) => setF({ ...f, nama_nasabah: e.target.value })} data-testid="assign-nasabah" />
        <Input label="Outstanding Pokok (Rp)" type="number" value={f.outstanding_pokok} onChange={(e) => setF({ ...f, outstanding_pokok: e.target.value })} data-testid="assign-outstanding" />
        <Select label="Tugaskan ke" value={f.assigned_to} onChange={(e) => setF({ ...f, assigned_to: e.target.value })} data-testid="assign-pic">
          {users.map((u) => <option key={u.id} value={u.id}>{u.kode_marketing} · {u.nama} ({u.jabatan})</option>)}
        </Select>
        <Button className="w-full" onClick={submit} data-testid="assign-submit">Simpan Tugas</Button>
      </div>
    </Modal>
  );
}

function SelfModal({ onClose, onDone, periode }) {
  const [f, setF] = useState({ nomor_kontrak: "", nama_nasabah: "", outstanding_pokok: "", status_penagihan: STATUS_OPTS[0], catatan: "" });
  const submit = async () => {
    try {
      await api.post("/collection/self", { ...f, outstanding_pokok: parseFloat(f.outstanding_pokok) || 0, periode });
      toast.success("Aktivitas tersimpan");
      onDone();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  return (
    <Modal open onClose={onClose} title="Input Mandiri Collection Activity">
      <div className="space-y-4">
        <Input label="Nomor Kontrak" value={f.nomor_kontrak} onChange={(e) => setF({ ...f, nomor_kontrak: e.target.value })} data-testid="self-kontrak" />
        <Input label="Nama Nasabah" value={f.nama_nasabah} onChange={(e) => setF({ ...f, nama_nasabah: e.target.value })} data-testid="self-nasabah" />
        <Input label="Outstanding Pokok (Rp)" type="number" value={f.outstanding_pokok} onChange={(e) => setF({ ...f, outstanding_pokok: e.target.value })} data-testid="self-outstanding" />
        <Select label="Status Penagihan" value={f.status_penagihan} onChange={(e) => setF({ ...f, status_penagihan: e.target.value })} data-testid="self-status">
          {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Input label="Catatan" value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} data-testid="self-catatan" />
        <Button className="w-full" onClick={submit} data-testid="self-submit">Simpan</Button>
      </div>
    </Modal>
  );
}

function StatusModal({ activity, onClose, onDone }) {
  const [status, setStatus] = useState(activity.status_penagihan || STATUS_OPTS[0]);
  const [catatan, setCatatan] = useState(activity.catatan || "");
  const submit = async () => {
    try {
      await api.put(`/collection/${activity.id}/status`, { status_penagihan: status, catatan });
      toast.success("Status diperbarui");
      onDone();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  return (
    <Modal open onClose={onClose} title="Update Status Penagihan" size="sm">
      <div className="space-y-4">
        <div className="text-sm text-slate-500">{activity.nomor_kontrak} · {activity.nama_nasabah}</div>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="update-status-select">
          {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Input label="Catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} data-testid="update-catatan" />
        <Button className="w-full" onClick={submit} data-testid="update-status-submit">Simpan</Button>
      </div>
    </Modal>
  );
}

function PhotoModal({ activity, readOnly, onClose, onDone }) {
  const token = localStorage.getItem("ao360_token");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState(activity.photos || []);
  const inputRef = useRef();

  const upload = async () => {
    if (!files.length) return toast.error("Pilih foto dulu");
    setUploading(true);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("activity_date", new Date().toISOString().slice(0, 10));
    try {
      const { data } = await api.post(`/collection/${activity.id}/photos`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPhotos((p) => [...p, ...data.photos]);
      setFiles([]);
      toast.success(`${data.photos.length} foto terunggah`);
      onDone && onDone();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setUploading(false); }
  };

  const TONE = { "Valid": "emerald", "Perlu Verifikasi Admin": "gold", "Lokasi Tidak Tersedia": "slate" };

  return (
    <Modal open onClose={onClose} title="Dokumentasi Foto" size="lg">
      <div className="space-y-5">
        <div className="text-sm text-slate-500">{activity.nomor_kontrak} · {activity.nama_nasabah}</div>
        {!readOnly && (
          <Card className="p-4 border-dashed border-2 border-emerald-200 bg-emerald-50/40">
            <input ref={inputRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 5))} data-testid="collection-photo-upload-input" className="hidden" />
            <div className="flex flex-col items-center text-center py-3">
              <Camera size={30} className="text-emerald-500 mb-2" />
              <p className="text-sm text-slate-600 mb-1">Ambil dari kamera atau pilih dari galeri (maks 5, dgn timestamp & geotag)</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} data-testid="pick-photo-btn">Pilih Foto</Button>
                <Button size="sm" onClick={upload} disabled={uploading || !files.length} data-testid="upload-photo-btn">{uploading ? "Mengunggah…" : `Unggah ${files.length || ""}`}</Button>
              </div>
            </div>
          </Card>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.length === 0 && <div className="col-span-full text-center text-slate-400 py-6">Belum ada foto</div>}
          {photos.map((p, i) => {
            const hasGps = p.latitude != null && p.longitude != null;
            const mapsUrl = hasGps ? `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}` : null;
            return (
            <div key={i} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              {hasGps ? (
                <a href={mapsUrl} target="_blank" rel="noreferrer" data-testid={`photo-map-${i}`} title="Buka lokasi di Google Maps" className="relative block group">
                  <img src={`${API}/collection/photo?path=${encodeURIComponent(p.foto_url)}&auth=${token}`} alt="dokumentasi" className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow">
                      <MapPin size={12} /> Buka di Google Maps
                    </span>
                  </div>
                </a>
              ) : (
                <img src={`${API}/collection/photo?path=${encodeURIComponent(p.foto_url)}&auth=${token}`} alt="dokumentasi" className="w-full h-32 object-cover" />
              )}
              <div className="p-2 space-y-1">
                <Pill tone={TONE[p.status_validasi] || "slate"}>{p.status_validasi}</Pill>
                <div className="text-[10px] text-slate-400 font-mono">{p.timestamp_foto}</div>
                {hasGps && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" data-testid={`map-link-${i}`} className="text-[11px] text-emerald-600 flex items-center gap-1 hover:underline font-semibold">
                    <ExternalLink size={10} /> Lihat Lokasi ({p.latitude}, {p.longitude})
                  </a>
                )}
                {!hasGps && <div className="text-[10px] text-slate-400">Lokasi tidak tersedia</div>}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
