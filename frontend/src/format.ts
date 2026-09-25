export function rupiah(n?: number | null): string {
  if (n == null) return "-";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function rupiahShort(n?: number | null): string {
  if (n == null) return "-";
  if (n >= 1e9) return "Rp " + (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1) + " M";
  if (n >= 1e6) return "Rp " + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + " Jt";
  return rupiah(n);
}

export function waLink(wa?: string | null, nomor?: string, judul?: string): string | null {
  if (!wa) return null;
  const msg =
    `Halo, saya tertarik dengan asset BSI Asset Deal.\n` +
    `Nomor Asset: ${nomor || "-"}\n` +
    `Nama Asset: ${judul || "-"}\n` +
    `Mohon informasi lebih lanjut.`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// status -> { label, tone }
export function fileSize(bytes?: number | null): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


export type Tone = "success" | "warning" | "error" | "info" | "brand" | "neutral";

export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  WAITING_ACRM_REVIEW: { label: "Menunggu Review ACRM", tone: "warning" },
  RETURN_TO_MARKETING: { label: "Dikembalikan ACRM", tone: "error" },
  ACRM_APPROVED: { label: "Disetujui ACRM", tone: "info" },
  WAITING_RCG_APPROVAL: { label: "Menunggu Approval RCG", tone: "warning" },
  RETURN_FROM_RCG: { label: "Dikembalikan RCG", tone: "error" },
  PUBLISHED: { label: "Dipublikasikan", tone: "success" },
  UPDATE_PENDING_ACRM: { label: "Update: Review ACRM", tone: "warning" },
  UPDATE_PENDING_RCG: { label: "Update: Approval RCG", tone: "warning" },
  SOLD: { label: "Terjual", tone: "info" },
  INACTIVE: { label: "Nonaktif", tone: "neutral" },
};

export function statusMeta(s?: string) {
  return STATUS_META[s || ""] || { label: s || "-", tone: "neutral" as Tone };
}
