import React, { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, DatabaseBackup, FileSpreadsheet } from "lucide-react";
import { api, apiError } from "../../lib/api";
import { usePeriod } from "../../components/Layout";
import { Card, SectionTitle, Button, Select, Pill } from "../../components/ui";

const EXPORT_TYPES = [
  { value: "pencapaian_pembiayaan", label: "Laporan Pencapaian Pembiayaan" },
  { value: "pencapaian_funding", label: "Laporan Pencapaian Funding" },
  { value: "recovery", label: "Laporan Recovery" },
  { value: "collection", label: "Laporan Collection Activity" },
];

export default function DataManagement() {
  const { periode } = usePeriod();
  const [exportType, setExportType] = useState(EXPORT_TYPES[0].value);
  const [importType, setImportType] = useState("pencapaian_pembiayaan");
  const [busy, setBusy] = useState(false);

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

  const doImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post(`/data/import/${importType}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (data.success) toast.success(`${data.imported} baris diimpor`);
      else toast.error(`Validasi gagal: ${data.errors.length} error`);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <SectionTitle sub="Import, export, dan backup data">Data Management</SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-6">
          <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center mb-4"><FileSpreadsheet className="text-emerald-700" /></div>
          <h3 className="font-heading font-bold text-lg">Export Data</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Unduh laporan dalam format XLSX.</p>
          <Select value={exportType} onChange={(e) => setExportType(e.target.value)} data-testid="export-type-select" className="mb-3">
            {EXPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Button className="w-full" disabled={busy} onClick={() => download(`/data/export/${exportType}?periode=${periode}`, `${exportType}_${periode}.xlsx`)} data-testid="export-btn"><Download size={16} /> Export XLSX</Button>
        </Card>

        <Card className="p-6">
          <div className="h-11 w-11 rounded-xl bg-gold-100 flex items-center justify-center mb-4"><Upload className="text-gold-700" /></div>
          <h3 className="font-heading font-bold text-lg">Import Data</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Unggah file JSON (array). Divalidasi sebelum commit.</p>
          <Select value={importType} onChange={(e) => setImportType(e.target.value)} data-testid="import-type-select" className="mb-3">
            <option value="pencapaian_pembiayaan">Transaksi Pembiayaan</option>
            <option value="pencapaian_funding">Transaksi Funding</option>
            <option value="recovery">Transaksi Recovery</option>
            <option value="target">Target</option>
          </Select>
          <input type="file" accept=".json" onChange={doImport} data-testid="import-file-input" className="hidden" id="import-file" />
          <Button className="w-full" variant="gold" onClick={() => document.getElementById("import-file").click()} data-testid="import-btn"><Upload size={16} /> Pilih File JSON</Button>
        </Card>

        <Card className="p-6">
          <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center mb-4"><DatabaseBackup className="text-slate-700" /></div>
          <h3 className="font-heading font-bold text-lg">Backup Database</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Unduh cadangan (tanpa password_hash).</p>
          <Pill tone="slate">Aman · tanpa kredensial</Pill>
          <Button className="w-full mt-4" variant="subtle" disabled={busy} onClick={() => download("/data/backup", `ao360_backup_${periode}.json`)} data-testid="backup-btn"><DatabaseBackup size={16} /> Unduh Backup</Button>
        </Card>
      </div>
    </div>
  );
}
