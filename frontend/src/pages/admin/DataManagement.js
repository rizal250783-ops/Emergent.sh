import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, DatabaseBackup, FileSpreadsheet, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, apiError } from "../../lib/api";
import { usePeriod } from "../../components/Layout";
import { Card, SectionTitle, Button, Select, Pill, Modal, Table, Spinner } from "../../components/ui";

const EXPORT_TYPES = [
  { value: "pencapaian_pembiayaan", label: "Laporan Pencapaian Pembiayaan" },
  { value: "pencapaian_funding", label: "Laporan Pencapaian Funding" },
  { value: "recovery", label: "Laporan Recovery" },
  { value: "collection", label: "Laporan Collection Activity" },
];
const IMPORT_TYPES = [
  { value: "pencapaian_pembiayaan", label: "Transaksi Pembiayaan" },
  { value: "pencapaian_funding", label: "Transaksi Funding" },
  { value: "recovery", label: "Transaksi Recovery" },
  { value: "target", label: "Target" },
];

export default function DataManagement() {
  const { periode } = usePeriod();
  const [exportType, setExportType] = useState(EXPORT_TYPES[0].value);
  const [importType, setImportType] = useState("pencapaian_pembiayaan");
  const [busy, setBusy] = useState(false);
  const [wizard, setWizard] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const importRef = useRef();
  const restoreRef = useRef();

  const download = async (url, filename) => {
    setBusy(true);
    try {
      const res = await api.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = filename; a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("Berhasil diunduh");
    } catch (e) { toast.error("Gagal mengunduh"); }
    finally { setBusy(false); }
  };

  const onPickImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    try {
      const { data } = await api.post(`/data/import-preview/${importType}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setWizard(data);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    finally { setBusy(false); e.target.value = ""; }
  };

  const commitImport = async () => {
    const validRows = wizard.rows.filter((r) => r.valid).map((r) => r.data);
    setBusy(true);
    try {
      const { data } = await api.post(`/data/import-commit/${wizard.jenis}`, { rows: validRows });
      toast.success(`${data.imported} baris berhasil diimpor`);
      setWizard(null);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const onPickRestore = (e) => {
    const file = e.target.files[0];
    if (file) setRestoreFile(file);
    e.target.value = "";
  };

  const doRestore = async () => {
    const fd = new FormData();
    fd.append("file", restoreFile);
    setBusy(true);
    try {
      const { data } = await api.post("/data/restore", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const total = Object.values(data.restored).reduce((a, b) => a + b, 0);
      toast.success(`Restore selesai · ${total} dokumen dipulihkan${data.auto_backup_saved ? " (backup otomatis dibuat)" : ""}`);
      setRestoreFile(null);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <SectionTitle sub="Import (dengan preview & validasi), export, backup, dan restore data">Data Management</SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-6">
          <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center mb-4"><FileSpreadsheet className="text-emerald-700" /></div>
          <h3 className="font-heading font-bold text-lg">Export Data</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Unduh laporan dalam format XLSX untuk periode terpilih.</p>
          <Select value={exportType} onChange={(e) => setExportType(e.target.value)} data-testid="export-type-select" className="mb-3">
            {EXPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Button className="w-full" disabled={busy} onClick={() => download(`/data/export/${exportType}?periode=${periode}`, `${exportType}_${periode}.xlsx`)} data-testid="export-btn"><Download size={16} /> Export XLSX</Button>
        </Card>

        <Card className="p-6">
          <div className="h-11 w-11 rounded-xl bg-gold-100 flex items-center justify-center mb-4"><Upload className="text-gold-700" /></div>
          <h3 className="font-heading font-bold text-lg">Import Wizard</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Unggah .xlsx / .csv / .json. Setiap baris divalidasi & dipratinjau sebelum disimpan.</p>
          <Select value={importType} onChange={(e) => setImportType(e.target.value)} data-testid="import-type-select" className="mb-3">
            {IMPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <input ref={importRef} type="file" accept=".json,.csv,.xlsx" onChange={onPickImport} data-testid="import-file-input" className="hidden" />
          <Button className="w-full" variant="gold" disabled={busy} onClick={() => importRef.current?.click()} data-testid="import-btn"><Upload size={16} /> Pilih File & Pratinjau</Button>
        </Card>

        <Card className="p-6">
          <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center mb-4"><DatabaseBackup className="text-slate-700" /></div>
          <h3 className="font-heading font-bold text-lg">Backup Database</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Unduh cadangan seluruh data (tanpa password).</p>
          <Pill tone="slate">Aman · tanpa kredensial</Pill>
          <Button className="w-full mt-4" variant="subtle" disabled={busy} onClick={() => download("/data/backup", `ao360_backup_${periode}.json`)} data-testid="backup-btn"><DatabaseBackup size={16} /> Unduh Backup</Button>
        </Card>

        <Card className="p-6 border-red-100">
          <div className="h-11 w-11 rounded-xl bg-red-100 flex items-center justify-center mb-4"><RotateCcw className="text-red-600" /></div>
          <h3 className="font-heading font-bold text-lg">Restore Database</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Pulihkan data dari file backup JSON. Backup otomatis dibuat sebelum diterapkan.</p>
          <Pill tone="red">Menimpa data saat ini</Pill>
          <input ref={restoreRef} type="file" accept=".json" onChange={onPickRestore} data-testid="restore-file-input" className="hidden" />
          <Button className="w-full mt-4" variant="danger" disabled={busy} onClick={() => restoreRef.current?.click()} data-testid="restore-btn"><RotateCcw size={16} /> Pilih File Backup</Button>
        </Card>
      </div>

      {wizard && <ImportWizardModal wizard={wizard} busy={busy} onClose={() => setWizard(null)} onCommit={commitImport} />}
      {restoreFile && (
        <Modal open onClose={() => setRestoreFile(null)} title="Konfirmasi Restore Database" size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 p-4">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-red-800">
                Restore akan <b>menimpa seluruh data saat ini</b> dengan isi file <b>{restoreFile.name}</b>.
                Sistem otomatis membuat backup keadaan sekarang sebelum menerapkan. Password pengguna tetap dipertahankan.
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="subtle" className="flex-1" onClick={() => setRestoreFile(null)}>Batal</Button>
              <Button variant="danger" className="flex-1" disabled={busy} onClick={doRestore} data-testid="confirm-restore-btn">{busy ? "Memulihkan…" : "Ya, Restore Sekarang"}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ImportWizardModal({ wizard, busy, onClose, onCommit }) {
  const columns = [
    { header: "#", render: (r) => <span className="text-slate-400">{r.row}</span>, className: "w-10" },
    { header: "Status", render: (r) => (r.valid ? <Pill tone="emerald"><span className="flex items-center gap-1"><CheckCircle2 size={12} /> Valid</span></Pill> : <Pill tone="red"><span className="flex items-center gap-1"><AlertTriangle size={12} /> Error</span></Pill>) },
    ...wizard.columns.map((c) => ({ header: c, render: (r) => <span className="text-xs font-mono">{String(r.data?.[c] ?? "—")}</span> })),
    { header: "Keterangan", render: (r) => (r.valid ? <span className="text-xs text-emerald-600">Siap diimpor</span> : <span className="text-xs text-red-600">{r.errors.join("; ")}</span>) },
  ];
  return (
    <Modal open onClose={onClose} title="Pratinjau & Validasi Import" size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Pill tone="slate">Total: {wizard.total} baris</Pill>
          <Pill tone="emerald">Valid: {wizard.valid_count}</Pill>
          <Pill tone="red">Error: {wizard.error_count}</Pill>
          <Pill tone="gold">{wizard.filename}</Pill>
        </div>
        {wizard.error_count > 0 && (
          <div className="text-xs text-slate-500 flex items-center gap-2"><AlertTriangle size={14} className="text-gold-500" /> Baris error akan dilewati. Hanya {wizard.valid_count} baris valid yang disimpan.</div>
        )}
        <div className="max-h-[50vh] overflow-y-auto">
          <Table columns={columns} rows={wizard.rows} testid="import-preview-table" />
        </div>
        <div className="flex gap-2">
          <Button variant="subtle" className="flex-1" onClick={onClose}>Batal</Button>
          <Button className="flex-1" disabled={busy || wizard.valid_count === 0} onClick={onCommit} data-testid="import-commit-btn">
            {busy ? "Menyimpan…" : `Import ${wizard.valid_count} Baris Valid`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
