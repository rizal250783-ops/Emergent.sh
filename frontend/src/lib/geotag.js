const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
  "Agustus", "September", "Oktober", "November", "Desember"];

export function fmtTanggalID(d) {
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtJamID(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ymdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolokasi tidak didukung browser ini"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
      }),
      (err) => reject(new Error(err.message || "kesalahan tidak diketahui")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  });
}

export function tanggalFotoDariFile(file) {
  return ymdLocal(new Date(file.lastModified));
}

function loadOrientedImage(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadViaImgEl(file));
  }
  return loadViaImgEl(file);
}

function loadViaImgEl(file) {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(objUrl); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("file bukan gambar yang valid")); };
    img.src = objUrl;
  });
}

export function watermarkPhoto(file, { picName, latitude, longitude }) {
  return loadOrientedImage(file).then((img) => {
    return new Promise((resolve, reject) => {
      try {
        const scale = Math.min(1, 1500 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        if (img.close) img.close();

        const now = new Date();
        const lines = [
          "PT BPRS HAJI MISKIN — COLLECTION ACTIVITY",
          `Tanggal: ${fmtTanggalID(now)}   Jam: ${fmtJamID(now)} WIB   PIC: ${picName}`,
          latitude != null && longitude != null
            ? `Lokasi: ${latitude}, ${longitude}`
            : "Lokasi: (tidak tersedia)",
        ];
        const fontSize = Math.max(14, Math.round(w / 48));
        const lineH = Math.round(fontSize * 1.6);
        const pad = Math.round(fontSize * 0.9);
        const stripH = lineH * lines.length + pad;
        const goldH = Math.max(3, Math.round(fontSize / 4));

        const grad = ctx.createLinearGradient(0, h - stripH, 0, h);
        grad.addColorStop(0, "rgba(6, 78, 59, 0.45)");
        grad.addColorStop(1, "rgba(6, 78, 59, 0.92)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, h - stripH, w, stripH);
        ctx.fillStyle = "#D4AF37";
        ctx.fillRect(0, h - stripH - goldH, w, goldH);

        ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.textBaseline = "middle";
        lines.forEach((ln, i) => {
          ctx.fillText(ln, pad, h - stripH + pad / 2 + lineH * i + lineH / 2);
        });

        const MAX_BYTES = 1024 * 1024;
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length * 0.75 > MAX_BYTES && quality > 0.5) {
          quality = Math.round((quality - 0.1) * 10) / 10;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve({ dataUrl, base64: dataUrl.split(",")[1] });
      } catch (e) {
        reject(e);
      }
    });
  });
}
