import React, { useEffect, useState } from "react";
import { api, formatRp, periodeLabel } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { usePeriod } from "../components/Layout";
import { Card, Spinner, SectionTitle, Table, Pill } from "../components/ui";

const CardShell = ({ children, testid }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2" data-testid={testid}>{children}</div>
);

const EmptyCards = ({ testid }) => <div className="py-8 text-center text-slate-400 text-sm" data-testid={testid}>Belum ada data</div>;

export default function Rekap() {
  const { user } = useAuth();
  const { periode } = usePeriod();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/rekap?periode=${periode}`).then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, [periode]);

  if (loading) return <Spinner />;

  const lendingCols = [
    { header: "No. Kontrak", key: "nomor_kontrak", className: "font-mono text-xs" },
    { header: "Akad", render: (r) => <Pill tone="emerald">{r.jenis_akad}</Pill> },
    { header: "Nasabah", key: "nama_nasabah" },
    { header: "Pencairan", render: (r) => <span className="font-mono font-semibold">{formatRp(r.jumlah_pencairan)}</span> },
    { header: "Tanggal", key: "tanggal_pencairan" },
  ];
  const fundingCols = [
    { header: "Nasabah", key: "nama_nasabah" },
    { header: "Jenis", render: (r) => <Pill tone="blue">{r.jenis_simpanan}</Pill> },
    { header: "Jumlah", render: (r) => <span className="font-mono font-semibold">{formatRp(r.jumlah_simpanan)}</span> },
    { header: "Tanggal", key: "tanggal" },
  ];
  const recoveryCols = [
    { header: "No. Kontrak", key: "nomor_kontrak", className: "font-mono text-xs" },
    { header: "Nasabah", key: "nama_nasabah" },
    { header: "Cash-in", render: (r) => <span className="font-mono font-semibold">{formatRp(r.jumlah_recovery)}</span> },
    { header: "Kol.", render: (r) => <Pill tone={r.kolektibilitas === 3 ? "emerald" : r.kolektibilitas === 4 ? "gold" : "red"}>Kol. {r.kolektibilitas}</Pill> },
    { header: "WO", render: (r) => (r.is_write_off ? <Pill tone="red">Write Off</Pill> : "—") },
    { header: "Tanggal", key: "tanggal" },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle sub={`Detail transaksi Anda · ${periodeLabel(periode)}`}>Rekap Nasabah Bulanan</SectionTitle>
      {data.pencairan && (
        <Card className="p-5 sm:p-6">
          <h3 className="font-heading font-semibold mb-4">Rekap Pencairan Pembiayaan</h3>
          <div className="hidden lg:block"><Table columns={lendingCols} rows={data.pencairan} testid="rekap-pencairan" /></div>
          <div className="lg:hidden space-y-3" data-testid="rekap-pencairan-cards">
            {data.pencairan.length === 0 && <EmptyCards testid="rekap-pencairan-empty" />}
            {data.pencairan.map((r) => (
              <CardShell key={r.id} testid={`rekap-pencairan-card-${r.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-500">{r.nomor_kontrak}</div>
                    <div className="font-semibold text-sm">{r.nama_nasabah}</div>
                  </div>
                  <Pill tone="emerald">{r.jenis_akad}</Pill>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">{r.tanggal_pencairan}</span>
                  <span className="font-mono font-bold text-ink">{formatRp(r.jumlah_pencairan)}</span>
                </div>
              </CardShell>
            ))}
          </div>
        </Card>
      )}
      {data.simpanan && (
        <Card className="p-5 sm:p-6">
          <h3 className="font-heading font-semibold mb-4">Rekap Simpanan (Funding)</h3>
          <div className="hidden lg:block"><Table columns={fundingCols} rows={data.simpanan} testid="rekap-simpanan" /></div>
          <div className="lg:hidden space-y-3" data-testid="rekap-simpanan-cards">
            {data.simpanan.length === 0 && <EmptyCards testid="rekap-simpanan-empty" />}
            {data.simpanan.map((r) => (
              <CardShell key={r.id} testid={`rekap-simpanan-card-${r.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm">{r.nama_nasabah}</div>
                  <Pill tone="blue">{r.jenis_simpanan}</Pill>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">{r.tanggal}</span>
                  <span className="font-mono font-bold text-ink">{formatRp(r.jumlah_simpanan)}</span>
                </div>
              </CardShell>
            ))}
          </div>
        </Card>
      )}
      {data.recovery && (
        <Card className="p-5 sm:p-6">
          <h3 className="font-heading font-semibold mb-4">Rekap Recovery</h3>
          <div className="hidden lg:block"><Table columns={recoveryCols} rows={data.recovery} testid="rekap-recovery" /></div>
          <div className="lg:hidden space-y-3" data-testid="rekap-recovery-cards">
            {data.recovery.length === 0 && <EmptyCards testid="rekap-recovery-empty" />}
            {data.recovery.map((r) => (
              <CardShell key={r.id} testid={`rekap-recovery-card-${r.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-500">{r.nomor_kontrak}</div>
                    <div className="font-semibold text-sm">{r.nama_nasabah}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Pill tone={r.kolektibilitas === 3 ? "emerald" : r.kolektibilitas === 4 ? "gold" : "red"}>Kol. {r.kolektibilitas}</Pill>
                    {r.is_write_off && <Pill tone="red">WO</Pill>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">{r.tanggal}</span>
                  <span className="font-mono font-bold text-ink">{formatRp(r.jumlah_recovery)}</span>
                </div>
              </CardShell>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
