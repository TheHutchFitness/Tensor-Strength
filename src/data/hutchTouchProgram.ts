// ============================================================================
// THE HUTCH TOUCH — 8-week, 6-day Push / Pull / Legs performance block
// ----------------------------------------------------------------------------
// This is Hutch's real program. Each week the primary strength lift and the
// power/plyometric movement rotate through a planned progression while the
// accessory + conditioning work stays consistent. The portal view shows the
// "heavy" Push / Pull / Legs exposure for each of the 8 weeks.
//
// Full PDF + Excel tracker are linked via HUTCH_TOUCH_PDF_URL / _TRACKER_URL.
// ============================================================================

export type HutchTouchDay = "Push" | "Pull" | "Legs";

export type HutchTouchExercise = {
  order: number;
  exercise: string;
  sets: string;
  load: string;
  notes: string;
};

export type HutchTouchSession = {
  week: number;
  day: HutchTouchDay;
  exercises: HutchTouchExercise[];
};

export const HUTCH_TOUCH_PRIMARIES: Record<HutchTouchDay, string> = {
  Push: "Bench / Larson Press",
  Pull: "Sumo Deadlift",
  Legs: "Front / Back Squat",
};

export const HUTCH_TOUCH_BASELINES: Record<string, string> = {
  "Larson Press": "Hutch's reference: worked to 255 lb for 5×3. Use your own current 3-rep strength.",
  "Sumo Deadlift": "Hutch's reference: worked to 500 lb for 2×3. Wedge in, spread the floor, finish tall.",
  "HBT Front Squat": "Hutch's reference: worked to 330 lb for 3×3. High-bar tempo, full depth, upright.",
};

export const HUTCH_TOUCH_PDF_URL =
  "https://customer-assets-39nsmqrw.emergentagent.net/job_trainer-profiles-2/artifacts/scqdmve8_The_Hutch_6_Day_PPL_Performance_Block.pdf";
export const HUTCH_TOUCH_TRACKER_URL =
  "https://customer-assets-39nsmqrw.emergentagent.net/job_trainer-profiles-2/artifacts/gbcebvnh_The_Hutch_6_Day_PPL_Performance_Tracker.xlsx";

type Slot = { exercise: string; sets: string; load: string; notes: string };

// --- PUSH -------------------------------------------------------------------
const PUSH_PRIMARY_BY_WEEK: string[] = [
  "Larson Press", "Larson Press", "HBT Bench", "HBT Bench",
  "Tempo Bench", "Close-Grip Bench", "Regular Bench (Test)", "Regular Bench (Test)",
];
const PUSH_FIXED_PRE: Slot[] = [
  { exercise: "Ab Roller", sets: "2-3 × 8-15", load: "Controlled", notes: "Core / bracing" },
  { exercise: "Med-Ball Slam", sets: "3 × 3-5", load: "Max intent", notes: "Full reset between reps" },
  { exercise: "Stability + Scap Retractions", sets: "2 rounds", load: "Easy", notes: "Shoulder prep" },
  { exercise: "T-Bar Power Movement", sets: "2-3 × 3-5", load: "Explosive", notes: "Stop if speed falls" },
  { exercise: "Shoulder / Rotator Mobility", sets: "3-5 min", load: "Easy", notes: "Prepare ROM" },
];
const PUSH_FIXED_POST: Slot[] = [
  { exercise: "Secondary Overhead Press", sets: "3 × 6-12", load: "RPE 7-8", notes: "DB / landmine / push press progression" },
  { exercise: "Weighted Dips", sets: "3 × 6-12", load: "RPE 8-9", notes: "No grinding on technique day" },
  { exercise: "Overhead Triceps", sets: "2 × 10-15", load: "RPE 8-9", notes: "" },
  { exercise: "Cable Pressdown", sets: "1-2 × 15-30", load: "RPE 8-9", notes: "" },
  { exercise: "Cable Fly", sets: "1-2 × 15-30", load: "RPE 8-9", notes: "" },
  { exercise: "Lateral Raise", sets: "2 × 12-20", load: "RPE 8-9", notes: "" },
  { exercise: "Face Pull / Reverse Fly", sets: "2 × 15-25", load: "RPE 6-8", notes: "Scap balance" },
  { exercise: "Treadmill / Bunny Hops", sets: "10-15 min", load: "Easy", notes: "Recovery / GPP" },
];

// --- PULL -------------------------------------------------------------------
// Items 6 & 7 (main pull + variation) change per week.
const PULL_MAIN_BY_WEEK: Slot[][] = [
  [{ exercise: "Sumo Deadlift", sets: "2-3 × 2-3", load: "RPE 7.5-9", notes: "Braced, vertical shin" }, { exercise: "BOSU RDL", sets: "2-3 sets", load: "RPE 7.5-9", notes: "Heavy day progresses load" }],
  [{ exercise: "Sumo Deadlift", sets: "2-3 × 2-3", load: "RPE 7.5-9", notes: "Braced, vertical shin" }, { exercise: "BOSU RDL", sets: "2-3 sets", load: "RPE 7.5-9", notes: "Heavy day progresses load" }],
  [{ exercise: "Sumo Deadlift", sets: "2-3 × 2-3", load: "RPE 7.5-9", notes: "Braced, vertical shin" }, { exercise: "Regular RDL", sets: "2-3 sets", load: "RPE 7.5-9", notes: "Hinge, flat back" }],
  [{ exercise: "Sumo Deadlift", sets: "2-3 × 2-3", load: "RPE 7.5-9", notes: "Braced, vertical shin" }, { exercise: "Regular RDL", sets: "2-3 sets", load: "RPE 7.5-9", notes: "Hinge, flat back" }],
  [{ exercise: "Power Clean", sets: "4-5 × 2-3", load: "Fast", notes: "Power cleans precede sumo" }, { exercise: "Sumo Deadlift", sets: "2-3 × 2-3", load: "RPE 7.5-9", notes: "Heavy day progresses load" }],
  [{ exercise: "Power Clean", sets: "4-5 × 2-3", load: "Fast", notes: "Power cleans precede sumo" }, { exercise: "Sumo Deadlift", sets: "2-3 × 2-3", load: "RPE 7.5-9", notes: "Heavy day progresses load" }],
  [{ exercise: "Sumo Deadlift", sets: "2-3 × 2-3", load: "RPE 7.5-9", notes: "Braced, vertical shin" }, { exercise: "Rack Pull", sets: "2-3 sets", load: "RPE 7.5-9", notes: "Overload top-end" }],
  [{ exercise: "Sumo Deadlift (Test)", sets: "2-3 × 2-3", load: "RPE 7.5-9", notes: "Technical-max single + optional AMRAP" }, { exercise: "Minimal / None", sets: "—", load: "—", notes: "Cut variation volume for testing" }],
];
const PULL_FIXED_PRE: Slot[] = [
  { exercise: "Seated Calf Raise", sets: "2 × 12-20", load: "Easy", notes: "" },
  { exercise: "Tib Raise", sets: "2 × 15-25", load: "Easy", notes: "" },
  { exercise: "Loaded Hyperextension", sets: "1 AMRAP / capped", load: "Hard", notes: "Don't pre-fatigue heavy sumo late block" },
  { exercise: "Hip Adduction / Abduction", sets: "1-2 × 12-20", load: "Easy", notes: "" },
  { exercise: "Explosive Step-Up", sets: "3 × 3 / side", load: "Max intent", notes: "Full reset" },
];
const PULL_FIXED_POST: Slot[] = [
  { exercise: "Scapular Retractions", sets: "2 × 15-20", load: "RPE 6-8", notes: "" },
  { exercise: "Shrugs", sets: "2 × 15-20", load: "RPE 8-9", notes: "" },
  { exercise: "Lat Pulldown", sets: "1 AMRAP / 2 hard", load: "RPE 9-10", notes: "" },
  { exercise: "Upper-Back Row", sets: "1 AMRAP / 2 hard", load: "RPE 9-10", notes: "" },
  { exercise: "Biceps", sets: "Rack run", load: "Hard", notes: "" },
  { exercise: "Lat Pullover", sets: "1-2 × 12-20", load: "Easy", notes: "" },
  { exercise: "Grip Training", sets: "2-4 sets", load: "Moderate", notes: "Cooldown" },
];

// --- LEGS -------------------------------------------------------------------
const LEGS_POWER_BY_WEEK: string[] = [
  "Box Jump", "Box Jump", "Depth Drop → Box Jump", "Depth Drop → Box Jump",
  "Lateral Bound → Box Jump", "Lateral Bound → Box Jump", "Max-Intent Box Jump", "Max-Intent Box Jump",
];
const LEGS_PRIMARY_BY_WEEK: string[] = [
  "HBT Front Squat", "Tempo Front Squat", "Front Squat", "HBT Back Squat",
  "Tempo Back Squat", "Back Squat", "Heavy Back Squat", "Back Squat (Test)",
];
const LEGS_FIXED_PRE: Slot[] = [
  { exercise: "Deep Calf Stretch", sets: "2-3 min", load: "Easy", notes: "" },
  { exercise: "Abductors + Adductors", sets: "1-2 × 12-20", load: "Easy", notes: "" },
  { exercise: "Lateral-Plane Work", sets: "2-3 sets", load: "Crisp", notes: "" },
  { exercise: "Plank", sets: "2-3 × 30-60 sec", load: "Controlled", notes: "" },
  { exercise: "Crunch Machine", sets: "2 × 10-20", load: "Moderate", notes: "" },
];
const LEGS_FIXED_POST: Slot[] = [
  { exercise: "Hack Squat", sets: "1 hard / AMRAP", load: "RPE 9-10", notes: "Taper heavy-day AMRAP late block" },
  { exercise: "Hack Sissy Squat", sets: "2 × 8-12", load: "RPE 8-9", notes: "" },
  { exercise: "Hamstring Curl", sets: "2 AMRAP", load: "Hard", notes: "" },
  { exercise: "Leg Extension", sets: "2 AMRAP", load: "Hard", notes: "" },
  { exercise: "Calf Raise", sets: "1 AMRAP", load: "Hard", notes: "" },
  { exercise: "Jump Lunges", sets: "2-3 short sets", load: "Crisp", notes: "Reduce late block" },
  { exercise: "StairMaster", sets: "10-15 min", load: "Easy-moderate", notes: "GPP" },
];

function withOrder(slots: Slot[], start: number): HutchTouchExercise[] {
  return slots.map((s, i) => ({ order: start + i, ...s }));
}

function buildPush(week: number): HutchTouchSession {
  const slots: Slot[] = [
    ...PUSH_FIXED_PRE,
    { exercise: PUSH_PRIMARY_BY_WEEK[week - 1], sets: "3-5 × 2-3", load: "RPE 7.5-9", notes: "Strength / performance — primary lift" },
    ...PUSH_FIXED_POST,
  ];
  return { week, day: "Push", exercises: withOrder(slots, 1) };
}

function buildPull(week: number): HutchTouchSession {
  const slots: Slot[] = [...PULL_FIXED_PRE, ...PULL_MAIN_BY_WEEK[week - 1], ...PULL_FIXED_POST];
  return { week, day: "Pull", exercises: withOrder(slots, 1) };
}

function buildLegs(week: number): HutchTouchSession {
  const slots: Slot[] = [
    ...LEGS_FIXED_PRE,
    { exercise: LEGS_POWER_BY_WEEK[week - 1], sets: "3 × 2-3", load: "Max intent", notes: "Full reset between reps" },
    { exercise: LEGS_PRIMARY_BY_WEEK[week - 1], sets: "3-4 × 2-3", load: "RPE 7.5-9", notes: "Strength / performance — primary lift" },
    ...LEGS_FIXED_POST,
  ];
  return { week, day: "Legs", exercises: withOrder(slots, 1) };
}

export const hutchTouchSessions: HutchTouchSession[] = [];
for (let w = 1; w <= 8; w++) {
  hutchTouchSessions.push(buildPush(w), buildPull(w), buildLegs(w));
}
