// Server-side generator for The Hutch Touch program PDF.
// It builds the document straight from hutchTouchProgram.ts so the download
// always matches the in-app program (including the plyometric progressions).

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import {
  hutchTouchSessions,
  HUTCH_TOUCH_PRIMARIES,
  type HutchTouchDay,
} from "@/data/hutchTouchProgram";

const ELECTRIC = rgb(0, 0.53, 0.85);
const INK = rgb(0.09, 0.09, 0.13);
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

export async function buildHutchTouchPdf(): Promise<Uint8Array> {
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

  // ---- Cover header ----
  page.drawText("THE HUTCH TOUCH", { x: MARGIN, y: y - 26, size: 26, font: bold, color: INK });
  y -= 44;
  page.drawText("8-Week · 6-Day Push / Pull / Legs Performance Block", {
    x: MARGIN, y, size: 12, font, color: ELECTRIC,
  });
  y -= 20;
  const intro =
    "Each week the primary strength lift and the power / plyometric movements rotate through a planned progression while the accessory and conditioning work stays consistent. Plyometrics are marked [PLYO] - perform them with max intent and a full reset between reps.";
  for (const ln of wrap(intro, font, 9.5, CONTENT_W)) {
    page.drawText(ln, { x: MARGIN, y, size: 9.5, font, color: MUTED });
    y -= 13;
  }
  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: RULE });
  y -= 22;

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
