// Restyles every PDF linked on the site to match The Hutch Touch program PDF's
// brand style: near-black cover, electric-blue accents, hexagon mark, big title
// + thin accent line + subtitle, and electric header/footer brand bars on the
// interior pages. Idempotent: originals are backed up once and always re-read
// from the backup so re-running never stacks covers.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const BACKUP = path.join(ROOT, "public", "_pdf_originals");

const INK = rgb(0.0, 0.0, 0.078);       // #000014 near-black
const ELECTRIC = rgb(0.2, 0.8, 1.0);    // #33ccff
const WHITE = rgb(1, 1, 1);
const MUTE = rgb(0.8, 0.82, 0.86);

const FILES = [
  { f: "public/programs/01_tensor_athletic_performance.pdf", title: "Athletic Performance", sub: "Training Program", desc: "Jumps, sprints, and heavy compound work to build explosiveness and make you a better athlete." },
  { f: "public/programs/02_tensor_strength_focus.pdf", title: "Strength Focus", sub: "Training Program", desc: "Squat, bench, deadlift, and press built around progressive overload for raw, usable strength." },
  { f: "public/programs/03_tensor_general_health.pdf", title: "General Health", sub: "Training Program", desc: "Balanced full-body training for energy, longevity, and staying capable — ideal if you're new." },
  { f: "public/programs/04_tensor_hypertrophy.pdf", title: "Hypertrophy", sub: "Training Program", desc: "Higher-volume training that targets every muscle group for size and definition." },
  { f: "public/programs/05_tensor_home_minimal_equipment.pdf", title: "Home / Minimal Equipment", sub: "Training Program", desc: "A full week you can run with just dumbbells or a few basics — no commercial gym required." },
  { f: "public/programs/06_tensor_anywhere_bodyweight.pdf", title: "Anywhere / Bodyweight", sub: "Training Program", desc: "Train anywhere — hotel, park, living room — using nothing but your bodyweight." },
  { f: "public/library/tensor-strength-accessory-lifts.pdf", title: "Accessory Lifts Build the Main Lifts", sub: "Training Guide", desc: "Why the work around your squat, bench, and deadlift decides how far they go." },
  { f: "public/library/tensor-strength-consistency.pdf", title: "Consistency Drives Progress", sub: "Training Guide", desc: "How showing up and repeating the basics beats chasing the perfect program." },
  { f: "public/library/tensor-strength-progressive-overload.pdf", title: "Progressive Overload Without Wrecking Your Joints", sub: "Training Guide", desc: "Add stress intelligently — change the tool before it starts beating you up." },
];

async function exists(p) { try { await access(p); return true; } catch { return false; } }

function wrap(text, font, size, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function drawHexagon(page, cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 6];
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 2, color: ELECTRIC });
  }
}

async function restyle(entry, bold, fontFor) {
  const abs = path.join(ROOT, entry.f);
  const backupPath = path.join(BACKUP, path.basename(entry.f));
  // Ensure we always start from the pristine original.
  if (!(await exists(backupPath))) {
    await writeFile(backupPath, await readFile(abs));
  }
  const srcBytes = await readFile(backupPath);
  const doc = await PDFDocument.load(srcBytes);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const pages = doc.getPages();
  const size0 = pages.length ? pages[0].getSize() : { width: 612, height: 792 };
  const w = size0.width;
  const h = size0.height;

  // --- Brand bars on every existing (interior) page ---
  pages.forEach((p, i) => {
    const { width, height } = p.getSize();
    // top electric rule
    p.drawRectangle({ x: 0, y: height - 3, width, height: 3, color: ELECTRIC });
    // bottom brand bar
    p.drawRectangle({ x: 0, y: 0, width, height: 18, color: ELECTRIC });
    p.drawText("TENSOR STRENGTH", { x: 14, y: 6, size: 7, font: boldFont, color: INK });
    const site = "TensorStrength.com";
    p.drawText(site, { x: width - 14 - boldFont.widthOfTextAtSize(site, 7), y: 6, size: 7, font: boldFont, color: INK });
    const pg = `${i + 2}`; // +2 because a cover becomes page 1
    p.drawText(pg, { x: width / 2 - font.widthOfTextAtSize(pg, 7) / 2, y: 6, size: 7, font, color: INK });
  });

  // --- Cover page (inserted at front) ---
  const cover = doc.insertPage(0, [w, h]);
  cover.drawRectangle({ x: 0, y: 0, width: w, height: h, color: INK });
  // top bar
  cover.drawRectangle({ x: 0, y: h - 24, width: w, height: 24, color: ELECTRIC });
  cover.drawText("TENSOR STRENGTH", { x: 20, y: h - 16, size: 9, font: boldFont, color: INK });
  const topR = entry.sub.toUpperCase();
  cover.drawText(topR, { x: w - 20 - boldFont.widthOfTextAtSize(topR, 9), y: h - 16, size: 9, font: boldFont, color: INK });

  // hexagon logo mark
  const cx = w / 2;
  drawHexagon(cover, cx, h * 0.7, 34);
  cover.drawText("TS", { x: cx - boldFont.widthOfTextAtSize("TS", 20) / 2, y: h * 0.7 - 8, size: 20, font: boldFont, color: ELECTRIC });

  // title (wrapped, centered)
  const maxW = w - 100;
  const titleSize = entry.title.length > 26 ? 30 : 40;
  const titleLines = wrap(entry.title.toUpperCase(), boldFont, titleSize, maxW);
  let ty = h * 0.5 + (titleLines.length - 1) * (titleSize * 0.55);
  for (const line of titleLines) {
    cover.drawText(line, { x: cx - boldFont.widthOfTextAtSize(line, titleSize) / 2, y: ty, size: titleSize, font: boldFont, color: WHITE });
    ty -= titleSize * 1.05;
  }

  // thin accent line + subtitle
  const lineY = ty + titleSize * 0.4;
  cover.drawLine({ start: { x: cx - 70, y: lineY }, end: { x: cx + 70, y: lineY }, thickness: 1.5, color: ELECTRIC });
  const sub = entry.sub.toUpperCase();
  cover.drawText(sub, { x: cx - boldFont.widthOfTextAtSize(sub, 13) / 2, y: lineY - 24, size: 13, font: boldFont, color: ELECTRIC });

  // description (wrapped, centered)
  const descLines = wrap(entry.desc, font, 11, maxW - 40);
  let dy = lineY - 52;
  for (const line of descLines) {
    cover.drawText(line, { x: cx - font.widthOfTextAtSize(line, 11) / 2, y: dy, size: 11, font, color: MUTE });
    dy -= 16;
  }

  // bottom bar
  cover.drawRectangle({ x: 0, y: 0, width: w, height: 24, color: ELECTRIC });
  cover.drawText("TENSOR STRENGTH", { x: 20, y: 8, size: 8, font: boldFont, color: INK });
  const bR = "TensorStrength.com";
  cover.drawText(bR, { x: w - 20 - boldFont.widthOfTextAtSize(bR, 8), y: 8, size: 8, font: boldFont, color: INK });

  const out = await doc.save();
  await writeFile(abs, out);
  return { file: entry.f, pages: doc.getPageCount() };
}

async function main() {
  await mkdir(BACKUP, { recursive: true });
  for (const e of FILES) {
    try {
      const r = await restyle(e);
      console.log("OK  ", r.file, `(${r.pages}p)`);
    } catch (err) {
      console.log("FAIL", e.f, err.message);
    }
  }
}

main();
