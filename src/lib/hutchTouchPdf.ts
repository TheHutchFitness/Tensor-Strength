// Server-side generator for The Hutch Touch program PDF.
// It builds the document straight from hutchTouchProgram.ts so the download
// always matches the in-app program (including the plyometric progressions).

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import {
  hutchTouchSessions,
  HUTCH_TOUCH_PRIMARIES,
  type HutchTouchDay,
} from "@/data/hutchTouchProgram";

const ELECTRIC = rgb(0, 0.53, 0.85);
const ELECTRIC_BRIGHT = rgb(0, 0.659, 1); // #00A8FF for the dark cover
const INK = rgb(0.09, 0.09, 0.13);
const COVER_BG = rgb(0.039, 0.016, 0.125); // #0a0420 brand dark
const BONE = rgb(0.96, 0.945, 0.91);
const BONE_DIM = rgb(0.75, 0.74, 0.72);
const MUTED = rgb(0.45, 0.47, 0.55);
const RULE = rgb(0.82, 0.84, 0.9);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Words that flag a plyometric / power movement (used to badge them in the PDF).
const PLYO_HINTS = [
  "jump", "plyo", "bound", "hop", "throw", "slam", "clean", "explosive",
  "depth", "power", "med-ball", "high pull", "swing", "step-up",
];
function isPlyo(name: string) {
  const n = name.toLowerCase();
  return PLYO_HINTS.some((h) => n.includes(h));
}

export type HutchPdfOptions = { clientName?: string; startDate?: Date };

export async function buildHutchTouchPdf(opts: HutchPdfOptions = {}): Promise<Uint8Array> {
  const clientName = (opts.clientName || "").trim();
  const startDate = opts.startDate || new Date();
  const dateStr = startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const doc = await PDFDocument.create();
  doc.setTitle("The Hutch Touch — 8-Week 6-Day PPL Performance Block");
  doc.setAuthor("Tensor Strength");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };
  // pdf-lib's standard fonts use WinAnsi encoding, which lacks a few glyphs we
  // use in the app (e.g. → and ▸). Map them to safe ASCII and drop anything
  // outside the Latin-1 range so generation never throws.
  const san = (s: any): string =>
    String(s ?? "")
      .replace(/\u2192/g, "->")
      .replace(/\u25B8/g, ">")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x00-\xFF]/g, "");

  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = san(text).split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(test, size) > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  };

  // ---- Branded cover page (dark, logo + brand colours) ----
  const drawCentered = (text: string, cy: number, f: PDFFont, size: number, color: any) => {
    const t = san(text);
    const w = f.widthOfTextAtSize(t, size);
    page.drawText(t, { x: (PAGE_W - w) / 2, y: cy, size, font: f, color });
  };

  // Full-bleed dark background.
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: COVER_BG });
  // Top + bottom electric accent bars.
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: ELECTRIC_BRIGHT });
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 6, color: ELECTRIC_BRIGHT });

  // Logo (embedded from /public). Best-effort — cover still renders without it.
  let logoBottom = PAGE_H - 150;
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "tensor-strength-logo.jpg"));
    const logo = await doc.embedJpg(logoBytes);
    const size = 120;
    const scaled = logo.scaleToFit(size, size);
    page.drawImage(logo, {
      x: (PAGE_W - scaled.width) / 2,
      y: PAGE_H - 90 - scaled.height,
      width: scaled.width,
      height: scaled.height,
    });
    logoBottom = PAGE_H - 90 - scaled.height;
  } catch {
    logoBottom = PAGE_H - 120;
  }

  let cy = logoBottom - 40;
  drawCentered("TENSOR STRENGTH", cy, bold, 12, ELECTRIC_BRIGHT);
  cy -= 46;
  drawCentered("THE HUTCH TOUCH", cy, bold, 34, BONE);
  cy -= 26;
  drawCentered("8-Week  ·  6-Day  ·  Push / Pull / Legs", cy, font, 13, BONE_DIM);
  cy -= 18;
  drawCentered("Performance Block", cy, font, 13, BONE_DIM);

  // Electric divider.
  cy -= 30;
  page.drawRectangle({ x: (PAGE_W - 90) / 2, y: cy, width: 90, height: 2, color: ELECTRIC_BRIGHT });

  // Personalized band — bespoke handout for the signed-in client.
  if (clientName) {
    cy -= 26;
    drawCentered(`PREPARED FOR ${clientName.toUpperCase()}`, cy, bold, 13, BONE);
    cy -= 16;
    drawCentered(`Start date · ${dateStr}`, cy, font, 10, ELECTRIC_BRIGHT);
  } else {
    cy -= 22;
    drawCentered(`Start date · ${dateStr}`, cy, font, 10, ELECTRIC_BRIGHT);
  }

  // Descriptor paragraph, centered.
  cy -= 26;
  const coverIntro =
    "Hutch's real strength & power program. The primary lift and the plyometric movements progress every week while the accessory and conditioning work stays consistent. Plyometrics are marked [PLYO] — hit them with max intent and a full reset between reps.";
  for (const ln of wrap(coverIntro, font, 11, CONTENT_W - 80)) {
    drawCentered(ln, cy, font, 11, BONE_DIM);
    cy -= 16;
  }

  // Three quick stat chips.
  cy -= 26;
  const stats = ["8 WEEKS", "6 DAYS / WEEK", "PUSH · PULL · LEGS"];
  const chipGap = 14;
  const chipPadX = 14;
  const chipH = 26;
  const chipSize = 10;
  const chipWidths = stats.map((s) => bold.widthOfTextAtSize(san(s), chipSize) + chipPadX * 2);
  const totalW = chipWidths.reduce((a, b) => a + b, 0) + chipGap * (stats.length - 1);
  let cx = (PAGE_W - totalW) / 2;
  stats.forEach((s, i) => {
    const w = chipWidths[i];
    page.drawRectangle({ x: cx, y: cy - chipH + 8, width: w, height: chipH, borderColor: ELECTRIC_BRIGHT, borderWidth: 1, color: rgb(0, 0.659, 1), opacity: 0.08 });
    page.drawText(san(s), { x: cx + chipPadX, y: cy - chipH + 16, size: chipSize, font: bold, color: ELECTRIC_BRIGHT });
    cx += w + chipGap;
  });

  // Cover footer.
  drawCentered("tensorstrength.com  ·  Clients & Members", 40, font, 9, MUTED);

  // ---- Program content begins on a fresh (white) page ----
  newPage();

  const days: HutchTouchDay[] = ["Push", "Pull", "Legs"];

  for (let week = 1; week <= 8; week++) {
    ensure(40);
    page.drawText(`WEEK ${week}`, { x: MARGIN, y, size: 15, font: bold, color: INK });
    y -= 20;

    for (const day of days) {
      // Variants A & B share the same exercises (only the label differs), so
      // render each day once.
      const session = hutchTouchSessions.find(
        (s) => s.week === week && s.day === day && s.variant === "A"
      );
      if (!session) continue;

      ensure(34);
      page.drawText(day.toUpperCase(), { x: MARGIN, y, size: 11.5, font: bold, color: ELECTRIC });
      const primary = HUTCH_TOUCH_PRIMARIES[day];
      page.drawText(san(`Primary: ${primary}`), {
        x: MARGIN + 90, y, size: 9, font, color: MUTED,
      });
      y -= 15;

      for (const ex of session.exercises) {
        const plyo = isPlyo(ex.exercise);
        const namePrefix = `${ex.order}.  `;
        const nameText = ex.exercise + (plyo ? "  [PLYO]" : "");
        const detail = `${ex.sets}  |  ${ex.load}${ex.notes ? "  -  " + ex.notes : ""}`;

        // Two columns: exercise name (left ~46%), prescription/notes (right).
        const leftW = CONTENT_W * 0.46;
        const rightW = CONTENT_W - leftW - 10;
        const nameLines = wrap(namePrefix + nameText, plyo ? bold : font, 9.5, leftW);
        const detailLines = wrap(detail, font, 9, rightW);
        const rows = Math.max(nameLines.length, detailLines.length);
        ensure(rows * 12 + 4);

        for (let i = 0; i < rows; i++) {
          if (nameLines[i]) {
            page.drawText(nameLines[i], {
              x: MARGIN, y, size: 9.5,
              font: plyo ? bold : font,
              color: plyo ? ELECTRIC : INK,
            });
          }
          if (detailLines[i]) {
            page.drawText(detailLines[i], {
              x: MARGIN + leftW + 10, y, size: 9, font, color: MUTED,
            });
          }
          y -= 12;
        }
      }
      y -= 8;
    }
    y -= 6;
  }

  // Footer note on the last page.
  ensure(20);
  page.drawText("Tensor Strength · The Hutch Touch · generated from the live program", {
    x: MARGIN, y: MARGIN - 18, size: 8, font, color: MUTED,
  });

  return doc.save();
}
