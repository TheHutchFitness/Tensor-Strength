/*
 * Generates the three "Library" PDFs for the Tensor Strength home page,
 * branded as TENSOR STRENGTH (the originals were externally hosted and
 * branded "The Hutch Fitness"). Output -> /public/library/*.pdf
 *
 * Run once:  node scripts/genLibraryPdfs.js
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

// ---- Brand palette (matches the site) ----
const INK = rgb(0.043, 0.06, 0.094); // deep navy/black background
const PANEL = rgb(0.078, 0.098, 0.14); // slightly lifted panel
const PANEL_LINE = rgb(0.16, 0.2, 0.27);
const BONE = rgb(0.9, 0.89, 0.85);
const BONE_DIM = rgb(0.62, 0.64, 0.68);
const ELECTRIC = rgb(0.17, 0.68, 1.0);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

function sanitize(text) {
  return String(text)
    .replace(/→/g, "->")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, "...")
    .replace(/[–—]/g, "-");
}

function wrapText(text, font, size, maxWidth) {
  const words = sanitize(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function buildDoc({ file, kicker, title, subtitle, blocks }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // logo
  const logoBytes = fs.readFileSync(
    path.join(__dirname, "..", "public", "tensor-strength-logo.jpg")
  );
  const logo = await doc.embedJpg(logoBytes);

  let page, y, pageNum = 0;

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    pageNum += 1;
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: INK });
    // top brand bar
    const logoDim = 26;
    page.drawImage(logo, { x: MARGIN, y: PAGE_H - 46, width: logoDim, height: logoDim });
    page.drawText("TENSOR STRENGTH", {
      x: MARGIN + logoDim + 10,
      y: PAGE_H - 40,
      size: 12,
      font: bold,
      color: BONE,
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - 58 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - 58 },
      thickness: 2,
      color: ELECTRIC,
    });
    // footer
    page.drawLine({
      start: { x: MARGIN, y: 46 },
      end: { x: PAGE_W - MARGIN, y: 46 },
      thickness: 0.5,
      color: PANEL_LINE,
    });
    page.drawText("TENSOR STRENGTH  ·  STRENGTH · PERFORMANCE · MOVEMENT", {
      x: MARGIN,
      y: 32,
      size: 7.5,
      font,
      color: BONE_DIM,
    });
    const pn = String(pageNum);
    page.drawText(pn, {
      x: PAGE_W - MARGIN - bold.widthOfTextAtSize(pn, 8),
      y: 32,
      size: 8,
      font: bold,
      color: ELECTRIC,
    });
    y = PAGE_H - 84;
  }

  function ensure(space) {
    if (y - space < 64) newPage();
  }

  function drawParagraph(text, { size = 10.5, color = BONE, gap = 6, lh = 1.42, fnt = font } = {}) {
    const lines = wrapText(text, fnt, size, CONTENT_W);
    for (const ln of lines) {
      ensure(size * lh);
      page.drawText(ln, { x: MARGIN, y, size, font: fnt, color });
      y -= size * lh;
    }
    y -= gap;
  }

  newPage();

  // ---- Cover block ----
  page.drawText(String(kicker).toUpperCase(), {
    x: MARGIN,
    y,
    size: 11,
    font: bold,
    color: ELECTRIC,
  });
  y -= 26;
  // Title (may be multi-line)
  const titleLines = wrapText(title, bold, 30, CONTENT_W);
  for (const ln of titleLines) {
    page.drawText(ln, { x: MARGIN, y, size: 30, font: bold, color: BONE });
    y -= 34;
  }
  y -= 6;
  if (subtitle) {
    drawParagraph(subtitle, { size: 11.5, color: BONE_DIM, gap: 14, fnt: font });
  }
  // accent divider
  page.drawRectangle({ x: MARGIN, y, width: 70, height: 3, color: ELECTRIC });
  y -= 22;

  // ---- Blocks ----
  for (const b of blocks) {
    if (b.t === "h2") {
      ensure(34);
      y -= 6;
      const lines = wrapText(b.text, bold, 15, CONTENT_W);
      for (const ln of lines) {
        page.drawText(ln, { x: MARGIN, y, size: 15, font: bold, color: ELECTRIC });
        y -= 19;
      }
      y -= 6;
    } else if (b.t === "p") {
      drawParagraph(b.text);
    } else if (b.t === "bullets") {
      for (const it of b.items) {
        const lines = wrapText(it, font, 10.5, CONTENT_W - 16);
        lines.forEach((ln, i) => {
          ensure(15);
          if (i === 0) {
            page.drawText("•", { x: MARGIN, y, size: 10.5, font: bold, color: ELECTRIC });
          }
          page.drawText(ln, { x: MARGIN + 16, y, size: 10.5, font, color: BONE });
          y -= 15;
        });
        y -= 3;
      }
      y -= 4;
    } else if (b.t === "callout") {
      const lines = wrapText(b.text, bold, 11, CONTENT_W - 28);
      const boxH = lines.length * 16 + 24;
      ensure(boxH + 8);
      page.drawRectangle({
        x: MARGIN,
        y: y - boxH + 12,
        width: CONTENT_W,
        height: boxH,
        color: PANEL,
        borderColor: ELECTRIC,
        borderWidth: 1.5,
      });
      let ty = y - 6;
      for (const ln of lines) {
        page.drawText(ln, { x: MARGIN + 14, y: ty, size: 11, font: bold, color: BONE });
        ty -= 16;
      }
      y = y - boxH - 6;
    } else if (b.t === "table") {
      const cols = b.widths || b.head.map(() => CONTENT_W / b.head.length);
      const rowGap = 6;
      const cellSize = 9.5;
      // header
      ensure(24);
      let x = MARGIN;
      page.drawRectangle({ x: MARGIN, y: y - 4, width: CONTENT_W, height: 20, color: PANEL });
      b.head.forEach((h, ci) => {
        page.drawText(String(h).toUpperCase(), { x: x + 6, y: y + 2, size: 8.5, font: bold, color: ELECTRIC });
        x += cols[ci];
      });
      y -= 24;
      // rows
      for (const row of b.rows) {
        // compute wrapped lines per cell
        const cellLines = row.map((c, ci) =>
          wrapText(c, font, cellSize, cols[ci] - 12)
        );
        const rowLines = Math.max(...cellLines.map((l) => l.length));
        const rowH = rowLines * (cellSize * 1.3) + rowGap;
        ensure(rowH + 4);
        x = MARGIN;
        cellLines.forEach((lines, ci) => {
          let cy = y;
          for (const ln of lines) {
            page.drawText(ln, { x: x + 6, y: cy, size: cellSize, font, color: BONE });
            cy -= cellSize * 1.3;
          }
          x += cols[ci];
        });
        y -= rowH;
        page.drawLine({
          start: { x: MARGIN, y: y + rowGap - 2 },
          end: { x: PAGE_W - MARGIN, y: y + rowGap - 2 },
          thickness: 0.5,
          color: PANEL_LINE,
        });
      }
      y -= 10;
    }
  }

  const bytes = await doc.save();
  const outDir = path.join(__dirname, "..", "public", "library");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, file), bytes);
  console.log("wrote", file, bytes.length, "bytes");
}

// =====================================================================
//  CONTENT
// =====================================================================
const DOCS = [
  {
    file: "tensor-strength-accessory-lifts.pdf",
    kicker: "Training",
    title: "Accessory Lifts Build The Main Lifts",
    subtitle:
      "Why the exercises around your squat, bench, and deadlift often determine how far those lifts can go. Build weak points. Build muscle. Build a bigger total.",
    blocks: [
      { t: "h2", text: "The Big Idea" },
      { t: "p", text: "Your competition lifts and primary strength movements are the skill you are trying to improve. Accessory lifts are the tools that build the muscle, positions, control, and weak-point strength that allow that skill to keep progressing. If you only hammer the main lift, you can get better at performing it — but eventually the same weak links keep showing up." },
      { t: "callout", text: "Your main lifts show you the problem. Good accessory work helps solve it." },
      { t: "h2", text: "Why Accessory Lifts Matter" },
      { t: "p", text: "1. They add muscle where you need it. Strength is specific, but muscle gives you more potential to produce force. Well-chosen rows, presses, split squats, hamstring work, triceps work, and upper-back work can add size to the exact muscle groups that support your main lifts." },
      { t: "p", text: "2. They attack weak points without endlessly maxing the main lift. If your bench stalls near lockout, stronger triceps may help. If your squat folds forward, more quad, upper-back, trunk, or positional work may be useful. If your deadlift struggles off the floor or above the knee, accessories can target the ranges that are limiting you." },
      { t: "p", text: "3. They let you accumulate productive volume. Heavy squat, bench, and deadlift work creates a lot of fatigue. Accessories allow you to perform additional hard training with loads and movements that are often easier to recover from — one of the main ways you create the adaptations needed for long-term progress." },
      { t: "p", text: "4. They build control and resilience. Single-leg work, controlled eccentrics, rows, carries, and trunk work can improve stability, coordination, and tolerance to training. A balanced program helps prepare more tissues and positions for the demands of heavy lifting." },
      { t: "h2", text: "Most Lifters Don't Push Accessories Hard Enough" },
      { t: "p", text: "A common mistake is treating accessory work like the part of the workout that happens after the 'real' training is finished — rushing through three sets of rows, leg curls, or triceps extensions with a weight you could have done for several more reps. That is movement, but it is not always a strong enough stimulus. For hypertrophy-focused work, the set usually needs to become genuinely challenging with clean technique." },
      {
        t: "table",
        head: ["Too Easy", "Productive"],
        widths: [CONTENT_W / 2, CONTENT_W / 2],
        rows: [
          ["Stopping because the target rep number was reached, though 5+ good reps were still available.", "Finishing most working sets with roughly 1–3 good reps left when the goal is muscle and local strength."],
          ["Using momentum or shortening the range just to move more weight.", "Progressively loading the movement while keeping the target muscle and technique honest."],
          ["Changing accessories constantly before you can measure progress.", "Keeping useful movements long enough to add reps, load, control, or range over time."],
        ],
      },
      { t: "h2", text: "Hard Does Not Mean Reckless" },
      { t: "bullets", items: [
        "Compound accessories: often live around RPE 7–9, depending on the phase, exercise, and fatigue.",
        "Isolation accessories: can often be pushed closer to technical failure because the systemic cost is lower.",
        "Progression: earn more reps or load while maintaining the standard of execution.",
        "Exercise selection: choose movements because they address a need — not because they look impressive.",
      ] },
      { t: "h2", text: "Accessory Work Should Have a Job" },
      {
        t: "table",
        head: ["Main lift issue", "Possible accessory focus"],
        widths: [CONTENT_W * 0.42, CONTENT_W * 0.58],
        rows: [
          ["Bench stalls off the chest", "Pecs, paused pressing, controlled dumbbell pressing"],
          ["Bench stalls at lockout", "Triceps, close-grip pressing, extensions"],
          ["Squat lacks leg drive", "Quads, split squats, leg press, belt squat"],
          ["Squat loses position", "Upper back, trunk, tempo/paused squat variations"],
          ["Deadlift struggles through hinge", "Hamstrings, glutes, RDLs, back extensions"],
          ["Deadlift position breaks down", "Lats, upper back, trunk, controlled hinge variations"],
        ],
      },
      { t: "h2", text: "The Tensor Strength Standard" },
      { t: "p", text: "Treat accessory lifts as training — not filler. Know why the exercise is in the program, perform it with intent, track it, and progress it. Your squat, bench, and deadlift should receive the highest level of specificity, but the work surrounding them builds the body capable of handling bigger weights." },
      { t: "callout", text: "Do not just practice being strong. Build the muscle and weak-point strength that makes you stronger." },
      { t: "p", text: "Educational content only. Training should be individualized to your experience, goals, recovery, and injury history." },
    ],
  },
  {
    file: "tensor-strength-consistency.pdf",
    kicker: "Mindset",
    title: "Consistency Drives Progress",
    subtitle:
      "Why showing up, repeating the basics, and giving your body time to adapt matters more than chasing the perfect program. You do not need perfect. You need repeatable.",
    blocks: [
      { t: "h2", text: "The Most Important Variable Is the One You Can Repeat" },
      { t: "p", text: "People often search for the perfect exercise, the perfect split, the perfect diet, or the perfect training method. Those things can matter, but none of them can produce much if they are only followed for a few days or weeks. Progress comes from giving your body a reason to adapt and then providing that reason consistently enough for the adaptation to happen." },
      { t: "callout", text: "A good plan performed consistently will usually beat a great plan performed occasionally." },
      { t: "h2", text: "How Consistency Alone Can Drive Progress" },
      { t: "p", text: "1. Your body adapts to repeated demands. Strength training works because the body responds to stress. Repeated exposure to appropriate resistance teaches you to produce force more efficiently and gives your muscles and supporting tissues time to adapt. One great workout is a stimulus. Months of good workouts create progress." },
      { t: "p", text: "2. Repetition improves skill. Squatting, pressing, hinging, rowing, jumping, and even basic machine work are skills. Repeating movements with good technique improves coordination and efficiency. Especially for beginners, simply becoming better at performing an exercise can produce noticeable strength gains." },
      { t: "p", text: "3. Consistent training creates enough total work. Results are built from accumulated training. Three productive sessions every week may not feel dramatic, but over a year that can become more than 150 opportunities to improve. Small amounts of quality work become powerful when they are repeated." },
      { t: "p", text: "4. Consistency makes progression measurable. When exercises and habits stay relatively stable, you can see whether reps, load, technique, range of motion, work capacity, or recovery are improving. Constantly changing everything makes it difficult to know what is actually working." },
      { t: "h2", text: "Progress Is Usually Less Dramatic Than People Expect" },
      { t: "p", text: "Most meaningful fitness progress is not created by one heroic session. It is built through small improvements that compound: one extra rep, slightly better technique, a small increase in load, another week of training completed, another night of adequate sleep, or another day of eating in a way that supports your goal." },
      {
        t: "table",
        head: ["Inconsistent approach", "Consistent approach"],
        widths: [CONTENT_W / 2, CONTENT_W / 2],
        rows: [
          ["Train extremely hard for 2 weeks, then disappear for 2 weeks.", "Choose a workload you can recover from and repeat week after week."],
          ["Change the program every time progress feels slow.", "Give useful movements enough time to produce measurable adaptation."],
          ["Wait for motivation before training.", "Build training into your routine and rely on habits more than motivation."],
          ["Try to make every workout perfect.", "Complete the best productive session you can on that day."],
          ["Judge progress workout to workout.", "Judge progress across weeks and months."],
        ],
      },
      { t: "h2", text: "Consistency Doesn't Mean Doing the Same Thing Forever" },
      { t: "p", text: "Consistency means keeping the important behaviors in place long enough to work. Your program should still evolve as you become stronger, more skilled, or better conditioned. Loads can increase, exercises can progress, volume can change, and goals can shift. The foundation remains the same: keep showing up and keep giving your body an appropriate reason to adapt." },
      { t: "h2", text: "What Consistency Actually Looks Like" },
      { t: "bullets", items: [
        "Train regularly: build a schedule that fits your real life instead of an ideal week you cannot maintain.",
        "Progress gradually: add reps, load, control, range, or training volume when you are ready.",
        "Recover consistently: sleep, food, hydration, and rest affect what you can repeatedly produce.",
        "Expect imperfect days: a lower-energy session can still move you forward.",
        "Stay patient: evaluate the trend over months, not your emotions after one workout.",
      ] },
      { t: "h2", text: "The Power of Compounding" },
      { t: "p", text: "Imagine improving by only a small amount at a time. The individual improvement may be almost impossible to notice. But when those improvements are repeated across dozens or hundreds of sessions, the difference can become enormous. That is why consistency is so powerful: it gives small wins enough time to accumulate." },
      {
        t: "table",
        head: ["Timeframe", "What it builds"],
        widths: [CONTENT_W * 0.32, CONTENT_W * 0.68],
        rows: [
          ["1 session", "A training stimulus"],
          ["10 sessions", "Better familiarity and work capacity"],
          ["50 sessions", "Meaningful accumulated practice and volume"],
          ["100+ sessions", "A completely different training base"],
          ["Months", "Habits become easier to maintain"],
          ["Years", "Consistency becomes a competitive advantage"],
        ],
      },
      { t: "h2", text: "The Tensor Strength Standard" },
      { t: "p", text: "Do not confuse intensity with consistency. You do not need to destroy yourself every workout to make progress. You need enough quality effort to create adaptation, enough recovery to come back, and enough discipline to repeat that process. Some days will be exceptional. Some will be average. The important part is that the work continues." },
      { t: "callout", text: "Show up. Do the work. Recover. Then do it again." },
      { t: "p", text: "Educational content only. Training should be individualized to your experience, goals, recovery, and injury history." },
    ],
  },
  {
    file: "tensor-strength-progressive-overload.pdf",
    kicker: "Programming",
    title: "Progressive Overload Without Destroying Your Joints",
    subtitle:
      "Progressive overload is the foundation of long-term strength and muscle growth — but it does not mean forcing more weight onto the exact same exercise forever. Train hard. Progress with intent. Change the tool before the tool starts beating you up.",
    blocks: [
      { t: "h2", text: "What Progressive Overload Actually Means" },
      { t: "p", text: "Progressive overload means asking your body to do slightly more over time. That progression can come from adding load, adding reps, improving technique, increasing range of motion, controlling the eccentric, performing the same work with less rest, or moving to a more demanding variation." },
      {
        t: "table",
        head: ["Method", "Example"],
        widths: [CONTENT_W * 0.32, CONTENT_W * 0.68],
        rows: [
          ["Load", "225 lb × 6 becomes 230 lb × 6"],
          ["Reps", "225 lb × 6 becomes 225 lb × 8"],
          ["Range of motion", "A partial movement progresses toward a controlled full ROM"],
          ["Control", "Same load and reps, but cleaner tempo and positioning"],
          ["Exercise variation", "A stable variation progresses to one that challenges a new position or weak point"],
        ],
      },
      { t: "h2", text: "Why Exercise Variations Matter" },
      { t: "p", text: "Your muscles need repeated exposure to get stronger, but your joints and connective tissues also experience repeated stress. Keeping one variation forever can make certain positions and movement patterns take the majority of that stress. Strategic variation lets you keep training the same fundamental pattern while slightly changing the demands." },
      { t: "p", text: "For example, you can keep building your squat without only back squatting year-round. A block might use a back squat, then a front squat, pause squat, safety-bar squat, or belt squat. You are still training the squat pattern, but the stress is distributed differently and new weak points are exposed." },
      { t: "h2", text: "The Key: Variation, Not Randomness" },
      { t: "p", text: "Switching exercises works best when it is planned. Changing everything every workout makes progression difficult to measure. Instead, keep a variation long enough to learn it, progress it, and collect useful performance data. Then rotate it when progress slows, discomfort starts accumulating, technique needs a new stimulus, or the next training phase has a different goal." },
      { t: "h2", text: "A Simple Tensor Strength Progression Model" },
      { t: "bullets", items: [
        "Pick the movement pattern — squat, hinge, horizontal press, vertical press, row, pull, carry, etc.",
        "Choose a variation you can perform well — one that fits your current mobility, skill, equipment, and goal.",
        "Build performance before chasing load — own the technique and add reps before forcing large jumps in weight.",
        "Increase one variable at a time — a little load, a rep, a set, ROM, or difficulty while keeping recovery manageable.",
        "Watch the quality of the adaptation — if strength is rising and movement feels good, keep going; if pain or fatigue keeps climbing, adjust.",
        "Rotate strategically — move to a related variation that trains the same pattern from a slightly different position.",
      ] },
      { t: "h2", text: "Examples of Smart Variation" },
      {
        t: "table",
        head: ["Main Pattern", "Possible Variations"],
        widths: [CONTENT_W * 0.32, CONTENT_W * 0.68],
        rows: [
          ["Squat", "Back squat → pause squat → front squat → belt squat"],
          ["Bench Press", "Competition bench → close-grip → paused bench → dumbbell press"],
          ["Hip Hinge", "Deadlift → RDL → block pull → trap-bar deadlift"],
          ["Vertical Press", "Barbell overhead press → dumbbell press → machine press → landmine press"],
          ["Row / Pull", "Barbell row → chest-supported row → cable row → single-arm row"],
        ],
      },
      { t: "h2", text: "What You Are Trying to Avoid" },
      { t: "p", text: "The problem is not that one exercise is automatically dangerous. The problem is repeatedly forcing progression when your body is no longer adapting well to that exact stress. Poor fatigue management, technique breakdown, excessive loading, and ignoring persistent discomfort can all increase injury risk. Variation gives you another way to keep progressing without forcing the same joint angles indefinitely." },
      { t: "h2", text: "The Bottom Line" },
      { t: "p", text: "Progressive overload should make you more capable over time — not simply more beat up. Build an exercise, earn progress, then strategically change the variation when needed. Keep the movement pattern. Change the stimulus. Attack new weak points. Build a more balanced, resilient athlete." },
      { t: "callout", text: "Keep the movement pattern. Change the stimulus. Build a more resilient athlete." },
      { t: "p", text: "Educational content only. Exercise selection and loading should be individualized. Persistent or worsening pain should be evaluated by an appropriate qualified healthcare professional." },
    ],
  },
];

(async () => {
  for (const d of DOCS) {
    await buildDoc(d);
  }
  console.log("done");
})();
