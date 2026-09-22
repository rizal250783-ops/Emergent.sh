import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { MapPin, Plus, Camera, ExternalLink, CheckCircle2, X } from "lucide-react";
import { api, apiError, API, formatRp } from "../lib/api";
import { getLocation, watermarkPhoto, tanggalFotoDariFile, ymdLocal } from "../lib/geotag";
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
        {loading ? <Spinner /> : (
          <>
            <div className="hidden lg:block"><Table columns={columns} rows={rows} testid="collection-table" empty="Belum ada aktivitas" /></div>
            <div className="lg:hidden space-y-3" data-testid="collection-cards">
              {rows.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">Belum ada aktivitas</div>}
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2" data-testid={`collection-card-${r.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-slate-500">{r.nomor_kontrak}</div>
                      <div className="font-semibold text-sm">{r.nama_nasabah}</div>
                      <div className="text-xs text-slate-400">{formatRp(r.outstanding_pokok)}</div>
                    </div>
                    <Pill tone={r.source === "admin_assigned" ? "gold" : "emerald"}>{r.source === "admin_assigned" ? "Ditugaskan" : "Mandiri"}</Pill>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.status_penagihan ? <Pill tone="blue">{r.status_penagihan}</Pill> : <Pill tone="slate">{r.status_kunjungan}</Pill>}
                    <span className="text-xs text-slate-400">PIC: {r.assigned_to_nama || "-"} · {r.photos?.length || 0} foto</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {!isAdmin && (r.status_kunjungan !== "Selesai" || r.source === "self_input") && (
                      <Button size="sm" variant="outline" onClick={() => setStatusOpen(r)} data-testid={`status-btn-m-${r.id}`}><CheckCircle2 size={13} /> Status</Button>
                    )}
                    {!isAdmin && (
                      <Button size="sm" variant="subtle" onClick={() => setPhotoOpen(r)} data-testid={`photo-btn-m-${r.id}`}><Camera size={13} /> Foto</Button>
                    )}
                    {isAdmin && r.photos?.length > 0 && (
                      <Button size="sm" variant="subtle" onClick={() => setPhotoOpen(r)} data-testid={`photo-btn-m-${r.id}`}><Camera size={13} /> Lihat</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
      window.dispatchEvent(new Event("collection-changed"));
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
      window.dispatchEvent(new Event("collection-changed"));
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
  const { user } = useAuth();
  const token = localStorage.getItem("ao360_token");
  const [items, setItems] = useState([]);
  const [loc, setLoc] = useState(null);
  const [locState, setLocState] = useState("default");
  const [locErr, setLocErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState(activity.photos || []);
  const [showCoord, setShowCoord] = useState({});
  const [zoomSrc, setZoomSrc] = useState(null);
  const inputRef = useRef();
  const today = ymdLocal(new Date());

  const processItems = (list, location) => {
    list.forEach((it, idx) => {
      watermarkPhoto(it.file, {
        picName: user.nama,
        latitude: location ? location.latitude : null,
        longitude: location ? location.longitude : null,
      })
        .then(({ dataUrl, base64 }) => setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, dataUrl, base64, ready: true, error: false } : p))))
        .catch(() => setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, ready: true, error: true } : p))));
    });
  };

  const ambilLokasi = async () => {
    setLocState("loading");
    try {
      const l = await getLocation();
      setLoc(l);
      setLocState("ok");
      if (items.length) {
        const reset = items.map((p) => ({ ...p, ready: false }));
        setItems(reset);
        processItems(reset, l);
      }
    } catch (e) {
      setLocErr(e.message || "tidak diketahui");
      setLocState("err");
    }
  };

  const onPick = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    e.target.value = "";
    if (!files.length) return;
    const list = files.map((f) => ({ file: f, dataUrl: null, base64: null, tanggalFoto: tanggalFotoDariFile(f), ready: false, error: false }));
    setItems(list);
    processItems(list, loc);
  };

  const upload = async () => {
    if (!items.length) return toast.error("Pilih foto dulu");
    if (!loc) return toast.error("Lokasi wajib diambil bila Anda mengunggah foto penagihan.");
    if (items.some((it) => !it.ready)) return toast.error("Watermark foto belum selesai, tunggu sebentar…");
    if (items.some((it) => it.error)) return toast.error("Ada foto yang tidak valid, ganti file-nya.");
    setUploading(true);
    try {
      const { data } = await api.post(`/collection/${activity.id}/photos-b64`, {
        activity_date: today,
        photos: items.map((it) => ({
          foto_b64: it.base64,
          latitude: loc.latitude,
          longitude: loc.longitude,
          tanggal_foto: it.tanggalFoto,
        })),
      });
      setPhotos((p) => [...p, ...data.photos]);
      setItems([]);
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
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={onPick} data-testid="collection-photo-upload-input" className="hidden" />
            <div className="flex flex-col items-center text-center py-3 space-y-2">
              <Camera size={30} className="text-emerald-500" />
              <p className="text-sm text-slate-600">Ambil dari kamera atau pilih dari galeri (maks 5, watermark timestamp & geotag otomatis)</p>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button size="sm" variant="outline" onClick={ambilLokasi} disabled={locState === "loading"} data-testid="ambil-lokasi-btn">
                  <MapPin size={13} /> {locState === "loading" ? "Mengambil…" : "Ambil Lokasi Saya"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} data-testid="pick-photo-btn">Pilih Foto</Button>
                <Button size="sm" onClick={upload} disabled={uploading || !items.length} data-testid="upload-photo-btn">{uploading ? "Mengunggah…" : `Unggah ${items.length || ""}`}</Button>
              </div>
              {locState === "ok" && loc ? (
                <p className="text-xs font-semibold text-emerald-600" data-testid="gps-status">Latitude {loc.latitude}, Longitude {loc.longitude} — tercatat.</p>
              ) : locState === "err" ? (
                <p className="text-xs font-semibold text-red-600" data-testid="gps-status">Lokasi tidak diperoleh: {locErr}</p>
              ) : (
                <p className="text-xs text-slate-500" data-testid="gps-status">Lokasi wajib diambil bila Anda mengunggah foto penagihan.</p>
              )}
            </div>
            {items.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {items.map((it, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-slate-200 bg-white" data-testid={`foto-preview-${i}`}>
                    <button type="button" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} disabled={uploading} data-testid={`foto-remove-${i}`} title="Hapus foto ini" className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600/90 text-white hover:bg-red-700 transition-colors shadow">
                      <X size={13} />
                    </button>
                    {it.dataUrl ? (
                      <img src={it.dataUrl} alt="preview watermark" onClick={() => setZoomSrc(it.dataUrl)} data-testid={`foto-zoom-${i}`} title="Klik untuk memperbesar" className="w-full h-32 object-cover cursor-zoom-in" />
                    ) : (
                      <div className="h-32 flex items-center justify-center text-xs text-slate-400">{it.error ? "File tidak valid" : "Memproses watermark…"}</div>
                    )}
                    <div className="px-2 pt-1 text-[10px] font-mono text-slate-500" data-testid={`foto-size-${i}`}>
                      {it.base64 ? `${Math.max(1, Math.round((it.base64.length * 3) / 4 / 1024))} KB (terkompresi)` : "…"}
                    </div>
                    {it.tanggalFoto !== today && (
                      <div className="bg-amber-50 text-amber-700 text-[10px] px-2 py-1 font-semibold" data-testid={`foto-warning-${i}`}>
                        Tanggal foto ({it.tanggalFoto}) berbeda dengan tanggal aktivitas — akan diverifikasi Admin.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.length === 0 && <div className="col-span-full text-center text-slate-400 py-6">Belum ada foto</div>}
          {photos.map((p, i) => {
            const hasGps = p.latitude != null && p.longitude != null;
            const mapsUrl = hasGps ? `https://maps.google.com/?q=${p.latitude},${p.longitude}` : null;
            return (
            <div key={i} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <img src={`${API}/collection/photo?path=${encodeURIComponent(p.foto_url)}&auth=${token}`} alt="dokumentasi" className="w-full h-32 object-cover" />
              <div className="p-2 space-y-1.5">
                <Pill tone={TONE[p.status_validasi] || "slate"}>{p.status_validasi}</Pill>
                <div className="text-[10px] text-slate-400 font-mono">{p.timestamp_foto}</div>
                {hasGps ? (
                  <>
                    <div className="flex gap-1.5 flex-wrap">
                      <button type="button" onClick={() => setShowCoord((s) => ({ ...s, [i]: !s[i] }))} data-testid={`photo-lokasi-${i}`} className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-300 transition-colors">
                        <MapPin size={10} /> Lokasi
                      </button>
                      <a href={mapsUrl} target="_blank" rel="noreferrer" data-testid={`photo-map-${i}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 transition-colors">
                        <ExternalLink size={10} /> Buka Google Maps
                      </a>
                    </div>
                    {showCoord[i] && <div className="text-[10px] font-mono text-slate-500" data-testid={`photo-coord-${i}`}>{p.latitude}, {p.longitude}</div>}
                  </>
                ) : (
                  <div className="text-[10px] text-slate-400">Lokasi tidak tersedia</div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>
      {zoomSrc && (
        <div className="fixed inset-0 z-[70] bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setZoomSrc(null)} data-testid="foto-lightbox">
          <button type="button" onClick={() => setZoomSrc(null)} data-testid="foto-lightbox-close" title="Tutup" className="absolute top-4 right-4 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/95 text-slate-700 hover:bg-white transition-colors shadow">
            <X size={18} />
          </button>
          <img src={zoomSrc} alt="preview diperbesar" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </Modal>
  );
}
