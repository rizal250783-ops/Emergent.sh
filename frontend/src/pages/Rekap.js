import React, { useEffect, useState } from "react";
import { api, formatRp, periodeLabel } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { usePeriod } from "../components/Layout";
import { Card, Spinner, SectionTitle, Table, Pill } from "../components/ui";

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
          <Table columns={lendingCols} rows={data.pencairan} testid="rekap-pencairan" />
        </Card>
      )}
      {data.simpanan && (
        <Card className="p-5 sm:p-6">
          <h3 className="font-heading font-semibold mb-4">Rekap Simpanan (Funding)</h3>
          <Table columns={fundingCols} rows={data.simpanan} testid="rekap-simpanan" />
        </Card>
      )}
      {data.recovery && (
        <Card className="p-5 sm:p-6">
          <h3 className="font-heading font-semibold mb-4">Rekap Recovery</h3>
          <Table columns={recoveryCols} rows={data.recovery} testid="rekap-recovery" />
        </Card>
      )}
    </div>
  );
}
