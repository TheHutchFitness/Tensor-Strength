// Server-side generator for The Hutch Touch tracker (.xlsx).
// Built from hutchTouchProgram.ts so the tracker always matches the in-app
// program (including the plyometric progressions). One sheet per week, each
// listing Push / Pull / Legs with the prescription plus blank columns for the
// athlete to log their actual weight, reps and RPE.

import ExcelJS from "exceljs";
import { readFile } from "fs/promises";
import path from "path";
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

  // Embed the brand logo once and reuse it across all week sheets (best-effort).
  let logoId: number | null = null;
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "tensor-strength-logo.jpg"));
    logoId = wb.addImage({ buffer: logoBytes as any, extension: "jpeg" });
  } catch {
    logoId = null;
  }

  const days: HutchTouchDay[] = ["Push", "Pull", "Legs"];
  const headers = ["Day", "#", "Exercise", "Sets / Reps", "Target Load", "Notes", "Actual Weight", "Actual Reps", "RPE"];

  // ---- Overview sheet (first tab) — the 8-week plan at a glance ----
  {
    const note = (exs: any[], re: RegExp) => exs.find((e) => re.test(e.notes || ""))?.exercise || "—";
    // The Pull main lift doesn't carry a "primary lift" note, so take the lift
    // immediately after the ballistic-power slot.
    const pullPrimary = (exs: any[]) => {
      const i = exs.findIndex((e) => /ballistic power/i.test(e.notes || ""));
      return i >= 0 && exs[i + 1] ? exs[i + 1].exercise : "—";
    };
    const ov = wb.addWorksheet("Overview", { views: [{ state: "frozen", ySplit: 4 }] });
    const ovHeaders = ["Week", "Push · Primary", "Push · Plyo", "Pull · Primary", "Pull · Plyo", "Legs · Primary", "Legs · Plyo 1", "Legs · Plyo 2"];
    ov.columns = [
      { width: 7 }, { width: 20 }, { width: 22 }, { width: 18 }, { width: 22 }, { width: 20 }, { width: 18 }, { width: 20 },
    ];

    // Title row + logo.
    ov.mergeCells(1, 1, 1, ovHeaders.length);
    const ovTitle = ov.getCell(1, 1);
    ovTitle.value = clientName
      ? `THE HUTCH TOUCH — 8-Week Overview   ·   Prepared for ${clientName}`
      : `THE HUTCH TOUCH — 8-Week Overview`;
    ovTitle.font = { bold: true, size: 14, color: { argb: BONE } };
    ovTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    ovTitle.alignment = { vertical: "middle", horizontal: "left", indent: logoId != null ? 6 : 1 };
    ov.getRow(1).height = 46;
    if (logoId != null) {
      ov.addImage(logoId, { tl: { col: 0.12, row: 0.12 } as any, ext: { width: 40, height: 40 } });
    }

    // Subtitle.
    ov.mergeCells(2, 1, 2, ovHeaders.length);
    const ovSub = ov.getCell(2, 1);
    ovSub.value = "How the primary lifts and plyometrics rotate across the block. Full session detail is on the Week 1–8 tabs.";
    ovSub.font = { italic: true, size: 9, color: { argb: "FF666666" } };
    ov.getRow(2).height = 16;
    ov.getRow(3).height = 4; // spacer

    // Header row (row 4).
    const ovHead = ov.getRow(4);
    ovHeaders.forEach((h, i) => {
      const c = ovHead.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, size: 10, color: { argb: INK } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ELECTRIC } };
      c.alignment = { vertical: "middle", horizontal: i === 0 ? "center" : "left", wrapText: true };
      c.border = { bottom: { style: "thin", color: { argb: "FFAAAAAA" } } };
    });
    ovHead.height = 26;

    for (let w = 1; w <= 8; w++) {
      const push = hutchTouchSessions.find((s) => s.week === w && s.day === "Push" && s.variant === "A");
      const pull = hutchTouchSessions.find((s) => s.week === w && s.day === "Pull" && s.variant === "A");
      const legs = hutchTouchSessions.find((s) => s.week === w && s.day === "Legs" && s.variant === "A");
      const row = ov.getRow(4 + w);
      const vals = [
        w,
        note(push?.exercises || [], /primary lift/i),
        note(push?.exercises || [], /upper-body plyometric/i),
        pullPrimary(pull?.exercises || []),
        note(pull?.exercises || [], /ballistic power/i),
        note(legs?.exercises || [], /primary lift/i),
        note(legs?.exercises || [], /full reset between reps/i),
        note(legs?.exercises || [], /second plyometric/i),
      ];
      vals.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v as any;
        const isPlyoCol = i === 2 || i === 4 || i === 6 || i === 7;
        c.font = { size: 10, bold: i === 0, color: { argb: isPlyoCol ? "FF0060A0" : "FF222222" } };
        c.alignment = { vertical: "middle", horizontal: i === 0 ? "center" : "left", wrapText: true };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isPlyoCol ? PLYO_BG : w % 2 === 0 ? "FFF4F7FA" : "FFFFFFFF" } };
        c.border = { bottom: { style: "hair", color: { argb: "FFDDDDDD" } } };
      });
      row.height = 20;
    }
  }

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
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: logoId != null ? 6 : 1 };
    ws.getRow(1).height = 46;

    // Brand logo anchored in the top-left of the dark title bar (matches the PDF).
    if (logoId != null) {
      ws.addImage(logoId, {
        tl: { col: 0.12, row: 0.12 } as any,
        ext: { width: 40, height: 40 },
      });
    }

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
