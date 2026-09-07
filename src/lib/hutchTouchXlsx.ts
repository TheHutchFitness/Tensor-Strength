// Server-side generator for The Hutch Touch tracker (.xlsx).
// Built from hutchTouchProgram.ts so the tracker always matches the in-app
// program (including the plyometric progressions). One sheet per week, each
// listing Push / Pull / Legs with the prescription plus blank columns for the
// athlete to log their actual weight, reps and RPE.

import ExcelJS from "exceljs";
import {
  hutchTouchSessions,
  HUTCH_TOUCH_PRIMARIES,
  type HutchTouchDay,
} from "@/data/hutchTouchProgram";

const ELECTRIC = "FF00A8FF";
const INK = "FF0A0420";
const BONE = "FFF5F1E8";
const DAY_BG = "FFE8F4FC";
const PLYO_BG = "FFDCEEFF";

const PLYO_HINTS = ["jump", "plyo", "bound", "hop", "throw", "slam", "clean", "explosive", "depth", "power", "med-ball", "high pull", "swing", "step-up"];
const isPlyo = (name: string) => {
  const n = (name || "").toLowerCase();
  return PLYO_HINTS.some((h) => n.includes(h));
};

export async function buildHutchTouchXlsx(opts: { clientName?: string } = {}): Promise<Buffer> {
  const clientName = (opts.clientName || "").trim();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tensor Strength";
  wb.title = "The Hutch Touch Tracker";

  const days: HutchTouchDay[] = ["Push", "Pull", "Legs"];
  const headers = ["Day", "#", "Exercise", "Sets / Reps", "Target Load", "Notes", "Actual Weight", "Actual Reps", "RPE"];

  for (let week = 1; week <= 8; week++) {
    const ws = wb.addWorksheet(`Week ${week}`, {
      views: [{ state: "frozen", ySplit: 3 }],
    });
    ws.columns = [
      { width: 8 }, { width: 4 }, { width: 34 }, { width: 14 },
      { width: 14 }, { width: 42 }, { width: 14 }, { width: 12 }, { width: 8 },
    ];

    // Title row.
    ws.mergeCells(1, 1, 1, headers.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = clientName
      ? `THE HUTCH TOUCH — Week ${week}   ·   Prepared for ${clientName}`
      : `THE HUTCH TOUCH — Week ${week}`;
    titleCell.font = { bold: true, size: 14, color: { argb: BONE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 26;

    // Subtitle row.
    ws.mergeCells(2, 1, 2, headers.length);
    const sub = ws.getCell(2, 1);
    sub.value = "Log your actual weight, reps and RPE each session. Plyometrics are highlighted — max intent, full reset.";
    sub.font = { italic: true, size: 9, color: { argb: "FF666666" } };
    ws.getRow(2).height = 16;

    // Header row (row 3).
    const headerRow = ws.getRow(3);
    headers.forEach((h, i) => {
      const c = headerRow.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, size: 10, color: { argb: INK } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ELECTRIC } };
      c.alignment = { vertical: "middle", horizontal: i >= 6 ? "center" : "left" };
      c.border = { bottom: { style: "thin", color: { argb: "FFAAAAAA" } } };
    });
    headerRow.height = 18;

    let r = 4;
    for (const day of days) {
      const session = hutchTouchSessions.find((s) => s.week === week && s.day === day && s.variant === "A");
      if (!session) continue;

      // Day banner row.
      ws.mergeCells(r, 1, r, headers.length);
      const dc = ws.getCell(r, 1);
      dc.value = `${day.toUpperCase()}   —   Primary: ${HUTCH_TOUCH_PRIMARIES[day]}`;
      dc.font = { bold: true, size: 11, color: { argb: "FF0060A0" } };
      dc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DAY_BG } };
      dc.alignment = { vertical: "middle", indent: 1 };
      ws.getRow(r).height = 20;
      r++;

      for (const ex of session.exercises) {
        const plyo = isPlyo(ex.exercise);
        const row = ws.getRow(r);
        row.getCell(1).value = day;
        row.getCell(2).value = ex.order;
        row.getCell(3).value = ex.exercise + (plyo ? "  [PLYO]" : "");
        row.getCell(4).value = ex.sets;
        row.getCell(5).value = ex.load;
        row.getCell(6).value = ex.notes;
        // Cols 7-9 (Actual Weight/Reps/RPE) left blank for the athlete.
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.font = { size: 10, bold: col === 3 && plyo };
          cell.alignment = { vertical: "middle", horizontal: col >= 7 ? "center" : col === 2 ? "center" : "left", wrapText: col === 6 };
          if (plyo) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PLYO_BG } };
          if (col >= 7) cell.border = { ...(cell.border || {}), bottom: { style: "hair", color: { argb: "FFCCCCCC" } } };
        });
        r++;
      }
      r++; // spacer row between days
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
