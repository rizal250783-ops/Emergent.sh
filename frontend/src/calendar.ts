import { Platform, Linking } from "react-native";
import * as Calendar from "expo-calendar";
import { publicAssetLink } from "@/src/api";

type AuctionAsset = {
  id: string; judul_asset: string; nomor_asset?: string; tanggal_lelang?: string | null;
  kpknl?: { nama: string; alamat?: string } | null; alamat?: string; kabupaten_kota?: string; provinsi?: string;
};

type ConfirmFn = (o: { title: string; message: string; confirmText?: string }) => Promise<{ ok: boolean }>;

function eventPayload(a: AuctionAsset) {
  const date = new Date(`${a.tanggal_lelang}T00:00:00`);
  const end = new Date(date); end.setDate(end.getDate() + 1);
  const title = `Lelang: ${a.judul_asset}`;
  const location = a.kpknl ? `${a.kpknl.nama}${a.kpknl.alamat ? ", " + a.kpknl.alamat : ""}` : [a.alamat, a.kabupaten_kota, a.provinsi].filter(Boolean).join(", ");
  const notes = `Jadwal lelang asset BSI ${a.nomor_asset || ""}\nLokasi asset: ${[a.alamat, a.kabupaten_kota, a.provinsi].filter(Boolean).join(", ")}\nDetail: ${publicAssetLink(a.id)}`;
  return { date, end, title, location, notes };
}

function gcalDate(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function writableCalendarId(): Promise<string | null> {
  if (Platform.OS === "ios") {
    const def = await Calendar.getDefaultCalendarAsync();
    if (def?.id) return def.id;
  }
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = cals.filter((c) => c.allowsModifications);
  const primary = writable.find((c) => (c as any).isPrimary) || writable.find((c) => c.source?.type === "com.google" || c.source?.name?.includes("@"));
  if (primary) return primary.id;
  if (writable[0]) return writable[0].id;
  // No writable calendar (e.g. emulator) -> create a local one
  const source = Platform.OS === "ios"
    ? (await Calendar.getDefaultCalendarAsync()).source
    : { isLocalAccount: true, name: "BSI Asset Deal", type: Calendar.SourceType.LOCAL } as any;
  return Calendar.createCalendarAsync({
    title: "BSI Asset Deal", color: "#00A0A0", entityType: Calendar.EntityTypes.EVENT, source,
    sourceId: (source as any)?.id, name: "BSI Asset Deal", ownerAccount: "personal", accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * One-tap "save auction date to phone calendar".
 * Native: expo-calendar with contextual permission flow. Web: opens Google Calendar prefilled.
 * Returns a status string for the caller's toast.
 */
export async function addAuctionToCalendar(a: AuctionAsset, confirm: ConfirmFn): Promise<{ ok: boolean; message: string; openSettings?: boolean }> {
  if (!a.tanggal_lelang) return { ok: false, message: "Asset ini belum memiliki jadwal lelang" };
  const ev = eventPayload(a);

  if (Platform.OS === "web") {
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${gcalDate(ev.date)}/${gcalDate(ev.end)}&details=${encodeURIComponent(ev.notes)}&location=${encodeURIComponent(ev.location)}`;
    await Linking.openURL(url);
    return { ok: true, message: "Google Calendar dibuka" };
  }

  let perm = await Calendar.getCalendarPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) {
      const r = await confirm({ title: "Izin Kalender Diblokir", message: "Aktifkan izin kalender di Pengaturan agar jadwal lelang bisa disimpan ke kalender HP Anda.", confirmText: "Buka Pengaturan" });
      if (r.ok) Linking.openSettings();
      return { ok: false, message: "", openSettings: true };
    }
    const r = await confirm({ title: "Izinkan Akses Kalender", message: "Kalender dipakai hanya untuk menambahkan pengingat tanggal lelang asset ini.", confirmText: "Lanjutkan" });
    if (!r.ok) return { ok: false, message: "" };
    perm = await Calendar.requestCalendarPermissionsAsync();
    if (!perm.granted) return { ok: false, message: "Izin kalender ditolak. Anda tetap bisa mencatat tanggal lelang secara manual." };
  }

  const calId = await writableCalendarId();
  if (!calId) return { ok: false, message: "Tidak ditemukan kalender yang bisa ditulis" };
  await Calendar.createEventAsync(calId, {
    title: ev.title, startDate: ev.date, endDate: ev.end, allDay: true, location: ev.location, notes: ev.notes,
    alarms: [{ relativeOffset: -24 * 60 }, { relativeOffset: -60 }],
  });
  return { ok: true, message: "Pengingat lelang tersimpan di kalender (H-1 & 1 jam sebelumnya)" };
}
