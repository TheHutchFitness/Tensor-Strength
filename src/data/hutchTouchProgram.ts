// ============================================================================
// THE HUTCH TOUCH — 4-session performance rotation
// ----------------------------------------------------------------------------
// This is Hutch's real training system. It is NOT a fixed weekly calendar — it
// runs as a four-session rotation (Upper Push, Lower Pull, Upper Pull, Legs).
// You move to the next session when recovery and movement quality support it.
//
// Overload comes primarily from VARIATION PROGRESSION on the main lifts (bench,
// squat, deadlift) plus honest RPE-based loading — not from just adding weight.
//
// There are two editions of the full program (delivered as PDFs):
//   • Performance Edition — the public / general-audience program (everyone).
//   • Athlete Edition     — Hutch's personal, advanced, autoregulated version
//                           (admin/owner only; served via a gated API route).
//
// The in-app tables below mirror the Performance Edition so members can load
// any session straight into the workout tracker.
// ============================================================================

export type HutchTouchSessionId = "push" | "lower-pull" | "upper-pull" | "legs";

export type HutchTouchExercise = {
  order: number;
  exercise: string;
  sets: string;
  reps: string;
  rpe: string;
  notes: string;
};

export type HutchTouchSession = {
  id: HutchTouchSessionId;
  number: number;
  title: string;
  focus: string; // the primary lift / theme of the session
  warmup: string[];
  exercises: HutchTouchExercise[];
};

// Static program PDFs.
// Performance Edition lives in /public (open to everyone).
// Athlete Edition is served through a gated API route (admin only) so it stays
// private — it is NOT placed in /public.
export const HUTCH_TOUCH_PERFORMANCE_PDF_URL = "/programs/hutch-touch-performance-edition.pdf";
export const HUTCH_TOUCH_ATHLETE_PDF_URL = "/api/hutch-touch/athlete-pdf";

// Short focus label per session (used in headers / pickers).
export const HUTCH_TOUCH_FOCUS: Record<HutchTouchSessionId, string> = {
  push: "Bench variation",
  "lower-pull": "Sumo deadlift",
  "upper-pull": "Weighted chin-up",
  legs: "Squat variation",
};

type Slot = { exercise: string; sets: string; reps: string; rpe: string; notes: string };

function withOrder(slots: Slot[]): HutchTouchExercise[] {
  return slots.map((s, i) => ({ order: i + 1, ...s }));
}

// --- SESSION 01 — UPPER BODY PUSH ------------------------------------------
const PUSH_WARMUP = [
  "Ab wheel",
  "Core / stability drill of choice",
  "Light med-ball slam",
  "Scapular retraction drill",
  "Rotational landmine hand-to-hand transfer",
  "Explosive OR stability push-up",
  "Rotator cuff external rotation",
  "Band shoulder mobility",
  "Bench ramp sets",
];
const PUSH_WORK: Slot[] = [
  { exercise: "Bench variation", sets: "3-5", reps: "3-5", rpe: "8", notes: "Use current progression phase. Recalibrate load every variation." },
  { exercise: "DB or barbell shoulder press", sets: "3-4", reps: "12-20", rpe: "8-9", notes: "High-volume press; control the bottom position." },
  { exercise: "Overhead triceps extension OR skull crusher", sets: "3", reps: "8-15", rpe: "8-9", notes: "Long-head triceps emphasis." },
  { exercise: "Weighted dips", sets: "3", reps: "6-10", rpe: "8-9", notes: "If unavailable: bodyweight dip AMRAP with clean reps." },
  { exercise: "Cable triceps pushdown", sets: "3", reps: "12-20", rpe: "8-9", notes: "Full lockout; no torso swing." },
  { exercise: "Cable fly", sets: "3", reps: "12-20", rpe: "8-9", notes: "Controlled stretch and squeeze." },
  { exercise: "Lateral raise", sets: "3", reps: "15-25", rpe: "8-9", notes: "High-quality delt volume." },
  { exercise: "Cardio of choice", sets: "1", reps: "10-20 min", rpe: "5-7", notes: "Finish with conditioning; do not turn every finish into a max test." },
];

// --- SESSION 02 — LOWER BODY PULL ------------------------------------------
const LOWER_PULL_WARMUP = [
  "Posterior-chain plyometric",
  "Explosive step-up",
  "Abductor machine",
  "Adductor machine",
  "Lateral-plane drill",
  "Core stability",
  "Hyperextension",
  "Sumo ramp sets",
];
const LOWER_PULL_WORK: Slot[] = [
  { exercise: "Sumo deadlift", sets: "3-5", reps: "3-5", rpe: "7-7.5", notes: "Technical anchor. Keep fatigue deliberately low. Sumo rack pull may occasionally substitute." },
  { exercise: "Secondary deadlift / hinge", sets: "3-4", reps: "see rotation", rpe: "8-9", notes: "Harder volume slot. Performance edition: BOSU RDL uses dumbbells only." },
  { exercise: "Hamstring curl", sets: "4", reps: "8-15", rpe: "8-9", notes: "Full shortening and controlled eccentric." },
  { exercise: "Calf raise", sets: "4", reps: "8-15", rpe: "8-9", notes: "Pause in stretch and top position." },
  { exercise: "Tibialis raise", sets: "3", reps: "15-25", rpe: "8-9", notes: "Controlled dorsiflexion." },
  { exercise: "Turkish get-up (athletic finisher)", sets: "2", reps: "2-3 / side", rpe: "6-7", notes: "Proprioception finisher. Controlled transitions; keep the load conservative and the shoulder stacked." },
  { exercise: "Cardio of choice", sets: "1", reps: "10-20 min", rpe: "5-7", notes: "Keep it sustainable after posterior-chain work." },
];

// --- SESSION 03 — UPPER BODY PULL ------------------------------------------
const UPPER_PULL_WARMUP = [
  "Light med-ball slam / upper-body explosive drill",
  "Pallof press",
  "Dead hang",
  "Scap pull-up",
  "Thoracic rotation",
  "Band pull-apart / face-pull pattern",
];
const UPPER_PULL_WORK: Slot[] = [
  { exercise: "Kelso shrug", sets: "3", reps: "10-15", rpe: "7-8", notes: "Prime upper-back retraction without arm dominance." },
  { exercise: "Weighted chin-up", sets: "4-5", reps: "4-8", rpe: "8-9", notes: "Primary vertical pull. Add load only with full range." },
  { exercise: "Single-arm dumbbell row", sets: "4", reps: "8-12", rpe: "8-9", notes: "Hard horizontal pull; control rotation." },
  { exercise: "Upper-back row of choice", sets: "3-4", reps: "10-15", rpe: "8-9", notes: "Bias upper back / rear shoulder." },
  { exercise: "Lat accessory of choice", sets: "3-4", reps: "10-15", rpe: "8-9", notes: "Pulldown, pullover, or similar lat bias." },
  { exercise: "Rear-delt work", sets: "3-4", reps: "15-25", rpe: "8-9", notes: "High-quality volume." },
  { exercise: "Forearm work", sets: "3", reps: "12-20", rpe: "8-9", notes: "Grip / wrist flexion-extension as needed." },
  { exercise: "Biceps work", sets: "3-4", reps: "8-15", rpe: "8-9", notes: "Choose curl variation based on elbow comfort." },
  { exercise: "Cardio of choice", sets: "1", reps: "10-20 min", rpe: "5-7", notes: "Short conditioning finish." },
];

// --- SESSION 04 — LEGS / LOWER BODY PUSH -----------------------------------
const LEGS_WARMUP = [
  "Box jump",
  "Jump lunge",
  "Core / stability drill",
  "Lateral-plane drill",
  "Deep calf stretch",
  "TKE (terminal knee extension)",
  "Squat patterning",
  "Squat ramp sets",
];
const LEGS_WORK: Slot[] = [
  { exercise: "Squat variation", sets: "3-5", reps: "3-5", rpe: "8-9", notes: "Primary heavy lower-body lift. Recalibrate load every phase." },
  { exercise: "Good morning OR hip-extension movement", sets: "3", reps: "6-10", rpe: "8", notes: "Posterior-chain strength without stealing from squat quality." },
  { exercise: "Walking lunge", sets: "3", reps: "8-12/leg", rpe: "8-9", notes: "Long, controlled steps." },
  { exercise: "Sissy squat — Smith preferred", sets: "3", reps: "10-20", rpe: "8-9", notes: "Quad bias; use pain-free range." },
  { exercise: "Leg extension", sets: "3", reps: "12-20", rpe: "9", notes: "Hard quad finish; controlled eccentric." },
  { exercise: "Calf raise", sets: "4", reps: "8-15", rpe: "8-9", notes: "Loaded stretch + full plantarflexion." },
  { exercise: "Tibialis raise", sets: "3", reps: "15-25", rpe: "8-9", notes: "Anterior lower-leg volume." },
  { exercise: "Hamstring curl", sets: "3", reps: "10-15", rpe: "8-9", notes: "Balance knee-flexion volume." },
  { exercise: "Abductor work", sets: "3", reps: "15-25", rpe: "8-9", notes: "Finish hips with controlled reps." },
  { exercise: "Cardio of choice", sets: "1", reps: "10-20 min", rpe: "5-7", notes: "Choose modality based on recovery." },
];

export const hutchTouchSessions: HutchTouchSession[] = [
  { id: "push", number: 1, title: "Upper Body Push", focus: HUTCH_TOUCH_FOCUS.push, warmup: PUSH_WARMUP, exercises: withOrder(PUSH_WORK) },
  { id: "lower-pull", number: 2, title: "Lower Body Pull", focus: HUTCH_TOUCH_FOCUS["lower-pull"], warmup: LOWER_PULL_WARMUP, exercises: withOrder(LOWER_PULL_WORK) },
  { id: "upper-pull", number: 3, title: "Upper Body Pull", focus: HUTCH_TOUCH_FOCUS["upper-pull"], warmup: UPPER_PULL_WARMUP, exercises: withOrder(UPPER_PULL_WORK) },
  { id: "legs", number: 4, title: "Legs / Lower Body Push", focus: HUTCH_TOUCH_FOCUS.legs, warmup: LEGS_WARMUP, exercises: withOrder(LEGS_WORK) },
];

// --- MAIN-LIFT VARIATION PROGRESSIONS --------------------------------------
export type ProgressionStep = { variation: string; purpose: string; detail: string };

export const HUTCH_TOUCH_BENCH_PROGRESSION: ProgressionStep[] = [
  { variation: "Larsen press", purpose: "Control + upper-body tension", detail: "No leg drive; load by RPE 8" },
  { variation: "Tempo bench press", purpose: "Eccentric control + position", detail: "Use prescribed tempo; reset load" },
  { variation: "Spoto press", purpose: "Pause control just off chest", detail: "Own the hover; no sink" },
  { variation: "HBT bench press", purpose: "Stability + force organization", detail: "Hanging Band Technique; conservative setup" },
  { variation: "Close-grip bench press", purpose: "Triceps strength + bar path", detail: "Narrow only as far as wrist/elbow mechanics allow" },
  { variation: "Floor press", purpose: "Mid-range strength + control", detail: "Dead stop each rep" },
  { variation: "Pin press", purpose: "Starting strength / overload", detail: "Set pins to target weak range" },
  { variation: "Banded bench press", purpose: "Power + accelerating resistance", detail: "Bands add resistance toward lockout" },
  { variation: "Regular bench press", purpose: "Expression / specificity", detail: "Bring the qualities back to the full lift" },
];

export const HUTCH_TOUCH_SQUAT_ROTATION: ProgressionStep[] = [
  { variation: "Front HBT squat", purpose: "Front-loaded stability + bracing", detail: "3-5 × 3-5 @ RPE 8-9" },
  { variation: "Zombie squat", purpose: "Upper-back position + torso control", detail: "3-5 × 3-5 @ RPE 8-9" },
  { variation: "Box SSB squat", purpose: "Positional strength + controlled reversal", detail: "3-5 × 3-5 @ RPE 8-9" },
  { variation: "Tempo squat", purpose: "Control through full range", detail: "3-5 × 3-5 @ RPE 8-9" },
  { variation: "Back HBT squat", purpose: "Back-squat pattern under instability", detail: "3-5 × 3-5 @ RPE 8-9" },
  { variation: "Regular back squat", purpose: "Expression / primary squat", detail: "3-5 × 3-5 @ RPE 8-9" },
];

export const HUTCH_TOUCH_DEADLIFT_ROTATION: ProgressionStep[] = [
  { variation: "Barbell RDL", purpose: "Loaded hinge strength + hamstrings", detail: "3-4 × 6-10 @ RPE 8-9" },
  { variation: "Dumbbell BOSU RDL", purpose: "Stability + hinge control; never chase failure", detail: "3 × 8-12 @ RPE 8 (public version)" },
  { variation: "Rack pull", purpose: "Overload / lockout strength", detail: "4 × 4-8 @ RPE 8-9" },
  { variation: "Banded conventional deadlift", purpose: "Power + force through lockout", detail: "4 × 3-6 @ RPE 8" },
];
