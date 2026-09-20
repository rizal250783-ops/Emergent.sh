import io
import os

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle, Paragraph,
                                Spacer, Image)

from database import db
from security import get_current_user
from calc import build_kpis, build_riwayat

router = APIRouter(prefix="/reports", tags=["reports"])

EMERALD = colors.HexColor("#047857")
EMERALD_DARK = colors.HexColor("#064E3B")
GOLD = colors.HexColor("#D97706")
LIGHT = colors.HexColor("#ECFDF5")
LOGO_PATH = "/app/frontend/public/logo.png"

STATUS_ID = {"excellent": "Sangat Baik", "good": "Baik", "need_attention": "Perlu Perhatian", "critical": "Kritis", "na": "N/A"}
MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]


def rupiah(n):
    if n is None:
        return "Rp 0"
    return "Rp " + f"{int(n):,}".replace(",", ".")


def periode_label(p):
    if not p:
        return ""
    y, m = p.split("-")
    return f"{MONTHS[int(m) - 1]} {y}"


@router.get("/ao-pdf/{ao_id}")
async def ao_pdf(ao_id: str, periode: str, user=Depends(get_current_user)):
    if user["jabatan"] not in ("Admin", "Direktur") and str(user["_id"]) != ao_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    target = await db.users.find_one({"_id": ObjectId(ao_id)})
    if not target:
        raise HTTPException(status_code=404, detail="AO tidak ditemukan")

    kpis = await build_kpis(target, periode)
    riwayat = await build_riwayat(ao_id, target["jabatan"])

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                            leftMargin=16 * mm, rightMargin=16 * mm, title=f"Rekap {target['nama']}")
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], textColor=EMERALD_DARK, fontSize=18, spaceAfter=2)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748b"))
    label = ParagraphStyle("label", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#334155"))
    sec = ParagraphStyle("sec", parent=styles["Heading2"], textColor=EMERALD, fontSize=13, spaceBefore=10, spaceAfter=6)
    white = ParagraphStyle("white", parent=styles["Normal"], fontSize=9, textColor=colors.white)

    elems = []
    # Header band
    header_cells = [[]]
    logo = None
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image(LOGO_PATH, width=16 * mm, height=16 * mm)
        except Exception:
            logo = ""
    title_block = [
        Paragraph("<b>PT BPRS HAJI MISKIN</b>", ParagraphStyle("t", parent=styles["Normal"], fontSize=13, textColor=colors.white)),
        Paragraph("AO-360 · Laporan Rekap Pencapaian AO", white),
    ]
    header = Table([[logo or "", title_block]], colWidths=[20 * mm, 150 * mm])
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), EMERALD_DARK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elems.append(header)
    elems.append(Spacer(1, 10))

    # AO info
    info = Table([
        [Paragraph("<b>Nama AO</b>", label), Paragraph(target["nama"], label),
         Paragraph("<b>Periode</b>", label), Paragraph(periode_label(periode), label)],
        [Paragraph("<b>Kode Marketing</b>", label), Paragraph(target["kode_marketing"], label),
         Paragraph("<b>Jabatan</b>", label), Paragraph(target["jabatan"], label)],
    ], colWidths=[35 * mm, 50 * mm, 30 * mm, 55 * mm])
    info.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#A7F3D0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D1FAE5")),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elems.append(info)

    # KPI table
    elems.append(Paragraph("Ringkasan Pencapaian", sec))
    kpi_head = ["Komponen", "Target", "Realisasi", "Achievement", "Status"]
    kpi_rows = [kpi_head]
    for k in kpis:
        ach = "N/A" if k["achievement"] is None else f"{k['achievement']:.1f}%"
        kpi_rows.append([k["komponen"], rupiah(k["target"]), rupiah(k["realisasi"]), ach, STATUS_ID.get(k["status"], "-")])
    if len(kpi_rows) == 1:
        kpi_rows.append(["Tidak ada komponen", "-", "-", "-", "-"])
    kt = Table(kpi_rows, colWidths=[40 * mm, 35 * mm, 35 * mm, 28 * mm, 32 * mm])
    kt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), EMERALD),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ]))
    elems.append(kt)

    # Riwayat table
    elems.append(Paragraph("Riwayat Performance Bulanan", sec))
    rhead = ["Bulan", "Target", "Realisasi", "Achievement", "Status"]
    rrows = [rhead]
    for r in riwayat:
        ach = "N/A" if r["achievement"] is None else f"{r['achievement']:.1f}%"
        rrows.append([periode_label(r["bulan"]), rupiah(r["target"]), rupiah(r["realisasi"]), ach, STATUS_ID.get(r["status"], "-")])
    rt = Table(rrows, colWidths=[38 * mm, 37 * mm, 37 * mm, 28 * mm, 30 * mm])
    rt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), EMERALD_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ]))
    elems.append(rt)

    elems.append(Spacer(1, 14))
    elems.append(Paragraph(f"Dicetak oleh {user['nama']} ({user['jabatan']}) · AO-360 PT BPRS Haji Miskin", small))

    doc.build(elems)
    buf.seek(0)
    fname = f"Rekap_{target['kode_marketing']}_{periode}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})
