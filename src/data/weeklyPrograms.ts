// ============================================================================
// WEEKLY PROGRAMS — rotating programs for members
// ----------------------------------------------------------------------------
// These show up in the Client Portal (/clients) behind the passcode gate, and
// the *current* week's program is teased on the public homepage.
//
// Each program has an active window (activeFrom → activeUntil). While that
// window is open, members have full access to the program. After it closes,
// the program auto-archives (shows as "Archived" and the content locks).
// This gives members temporary access — the program is theirs for its week.
//
// To add a weekly program:
//   1. Copy one of the objects below and edit the fields.
//   2. Set activeFrom / activeUntil to the week the program is "live."
//   3. Fill in `days` with the sessions, or set `pdfUrl` to link a PDF instead.
//   4. Save. Re-publish.
//
// Dates are ISO (YYYY-MM-DD). The status (Active / Upcoming / Archived) is
// computed automatically from the visitor's current date.
// ============================================================================

export type ProgramDay = {
  day: string; // e.g. "Monday", "Day 1"
  focus: string; // e.g. "Lower — Strength"
  exercises: { name: string; sets: string; reps: string; notes?: string }[];
};

export type WeeklyProgram = {
  id: string;
  title: string;
  purpose: string; // e.g. "Hypertrophy", "Peak strength", "Deload"
  purposeTag: string; // short tag for the badge
  weekLabel: string; // e.g. "Week of Sept 1"
  description: string;
  activeFrom: string; // ISO date
  activeUntil: string; // ISO date (inclusive)
  pdfUrl?: string; // optional: link a PDF instead of inline days
  days?: ProgramDay[];
  free?: boolean; // optional: if true, non-members can view full sessions on the public site
};

export const weeklyPrograms: WeeklyProgram[] = [
  {
    id: "hypertrophy-w1",
    title: "Hypertrophy Block — Week 1",
    purpose: "Build muscle mass with higher-volume compound and accessory work across 5 sessions.",
    purposeTag: "Hypertrophy",
    weekLabel: "Week of Sept 1",
    description:
      "Five training days, push/pull/legs split with two upper-body days. Volume is the driver — hit every set close to failure with clean form.",
    activeFrom: "2026-09-01",
    activeUntil: "2026-09-07",
    days: [
      {
        day: "Monday",
        focus: "Push — Chest / Shoulders / Triceps",
        exercises: [
          { name: "Barbell Bench Press", sets: "4", reps: "6–8", notes: "RPE 8 top set" },
          { name: "Incline Dumbbell Press", sets: "3", reps: "10–12" },
          { name: "Overhead Press", sets: "3", reps: "8–10" },
          { name: "Cable Fly", sets: "3", reps: "12–15" },
          { name: "Triceps Pushdown", sets: "3", reps: "12–15" },
        ],
      },
      {
        day: "Tuesday",
        focus: "Pull — Back / Biceps",
        exercises: [
          { name: "Deadlift", sets: "3", reps: "5", notes: "RPE 7 — technique focus" },
          { name: "Barbell Row", sets: "4", reps: "8–10" },
          { name: "Lat Pulldown", sets: "3", reps: "10–12" },
          { name: "Cable Row", sets: "3", reps: "12" },
          { name: "Barbell Curl", sets: "3", reps: "10–12" },
        ],
      },
      {
        day: "Thursday",
        focus: "Legs — Quads / Glutes",
        exercises: [
          { name: "Back Squat", sets: "4", reps: "6–8", notes: "RPE 8 top set" },
          { name: "Romanian Deadlift", sets: "3", reps: "10" },
          { name: "Bulgarian Split Squat", sets: "3", reps: "10–12 / leg" },
          { name: "Leg Extension", sets: "3", reps: "15" },
          { name: "Calf Raise", sets: "4", reps: "12–15" },
        ],
      },
      {
        day: "Friday",
        focus: "Upper — Chest / Back / Arms",
        exercises: [
          { name: "Incline Barbell Bench Press", sets: "4", reps: "8–10" },
          { name: "Pull-Up", sets: "3", reps: "AMRAP" },
          { name: "Dumbbell Shoulder Press", sets: "3", reps: "10–12" },
          { name: "Pendlay Row", sets: "3", reps: "8–10" },
          { name: "Hammer Curl + Skull Crusher superset", sets: "3", reps: "12 + 12" },
        ],
      },
      {
        day: "Saturday",
        focus: "Conditioning + Core",
        exercises: [
          { name: "Kettlebell Swing", sets: "5", reps: "20", notes: "EMOM 10 min" },
          { name: "Farmer's Walk", sets: "4", reps: "40 m" },
          { name: "Hanging Leg Raise", sets: "3", reps: "12–15" },
          { name: "Ab Wheel Rollout", sets: "3", reps: "10–12" },
        ],
      },
    ],
  },
  {
    id: "strength-peak-w2",
    title: "Strength Peak — Week 2",
    purpose: "Heavy compound focus to build toward new 1RMs. Lower volume, higher intensity.",
    purposeTag: "Strength",
    weekLabel: "Week of Sept 8",
    description:
      "Four training days, heavy doubles and triples on the big three. Accessories keep the joints healthy without cutting into recovery.",
    activeFrom: "2026-09-08",
    activeUntil: "2026-09-14",
    days: [
      {
        day: "Monday",
        focus: "Squat — Heavy",
        exercises: [
          { name: "Back Squat", sets: "5", reps: "3", notes: "RPE 9 top set" },
          { name: "Pause Squat", sets: "3", reps: "3" },
          { name: "Front Squat", sets: "3", reps: "5" },
          { name: "Good Morning", sets: "3", reps: "8" },
        ],
      },
      {
        day: "Wednesday",
        focus: "Bench — Heavy",
        exercises: [
          { name: "Barbell Bench Press", sets: "5", reps: "2", notes: "RPE 9 top set" },
          { name: "Close-Grip Bench Press", sets: "3", reps: "5" },
          { name: "Overhead Press", sets: "3", reps: "6" },
          { name: "Triceps Dip", sets: "3", reps: "8–10" },
        ],
      },
      {
        day: "Friday",
        focus: "Deadlift — Heavy",
        exercises: [
          { name: "Deadlift", sets: "4", reps: "2", notes: "RPE 9 top set" },
          { name: "Deficit Deadlift", sets: "3", reps: "3" },
          { name: "Barbell Row", sets: "3", reps: "6" },
          { name: "Pull-Up", sets: "3", reps: "AMRAP" },
        ],
      },
      {
        day: "Saturday",
        focus: "Accessories + Core",
        exercises: [
          { name: "Bulgarian Split Squat", sets: "3", reps: "10 / leg" },
          { name: "Cable Row", sets: "3", reps: "12" },
          { name: "Face Pull", sets: "3", reps: "15" },
          { name: "Hanging Leg Raise", sets: "3", reps: "12" },
        ],
      },
    ],
  },
  {
    id: "deload-w0",
    title: "Deload Week",
    purpose: "Drop volume and intensity to recover, reset, and prep for the next block.",
    purposeTag: "Deload",
    weekLabel: "Week of Aug 25",
    description:
      "Three easy sessions at ~60% intensity. Keep movement quality high, cut volume roughly in half. Sleep and eat well.",
    activeFrom: "2026-08-25",
    activeUntil: "2026-08-31",
    days: [
      {
        day: "Monday",
        focus: "Full Body — Easy",
        exercises: [
          { name: "Back Squat", sets: "3", reps: "5", notes: "60% 1RM" },
          { name: "Bench Press", sets: "3", reps: "5", notes: "60% 1RM" },
          { name: "Barbell Row", sets: "3", reps: "8" },
        ],
      },
      {
        day: "Wednesday",
        focus: "Upper — Easy",
        exercises: [
          { name: "Overhead Press", sets: "3", reps: "5", notes: "60% 1RM" },
          { name: "Pull-Up", sets: "3", reps: "60% max reps" },
          { name: "Cable Fly", sets: "2", reps: "12" },
        ],
      },
      {
        day: "Friday",
        focus: "Lower — Easy",
        exercises: [
          { name: "Deadlift", sets: "2", reps: "3", notes: "70% 1RM" },
          { name: "Front Squat", sets: "3", reps: "5" },
          { name: "Calf Raise", sets: "3", reps: "12" },
        ],
      },
    ],
  },

  // ---- Free starter programs (accessible to non-members) ----
  {
    id: "free-beginner-fullbody",
    title: "Beginner Full-Body",
    purpose: "Three simple full-body sessions a week to learn the basics and build a base.",
    purposeTag: "Beginner",
    weekLabel: "Free starter",
    description:
      "The perfect first week if you're new to barbell training. Three sessions, every other day, focused on the fundamental lifts with moderate volume.",
    activeFrom: "2026-01-01",
    activeUntil: "2026-12-31",
    free: true,
    days: [
      {
        day: "Day 1",
        focus: "Full Body A",
        exercises: [
          { name: "Back Squat", sets: "3", reps: "8", notes: "Light — focus on depth" },
          { name: "Bench Press", sets: "3", reps: "8" },
          { name: "Barbell Row", sets: "3", reps: "8" },
          { name: "Plank", sets: "3", reps: "30 sec" },
        ],
      },
      {
        day: "Day 2",
        focus: "Full Body B",
        exercises: [
          { name: "Deadlift", sets: "3", reps: "5", notes: "Light — drill the hinge" },
          { name: "Overhead Press", sets: "3", reps: "8" },
          { name: "Lat Pulldown", sets: "3", reps: "10" },
          { name: "Hanging Knee Raise", sets: "3", reps: "10" },
        ],
      },
      {
        day: "Day 3",
        focus: "Full Body A",
        exercises: [
          { name: "Back Squat", sets: "3", reps: "8" },
          { name: "Bench Press", sets: "3", reps: "8" },
          { name: "Barbell Row", sets: "3", reps: "8" },
          { name: "Ab Wheel Rollout", sets: "3", reps: "8" },
        ],
      },
    ],
  },
  {
    id: "free-home-dumbbell",
    title: "Home Dumbbell Workout",
    purpose: "Four sessions you can do at home with just a pair of dumbbells.",
    purposeTag: "Home / Minimal",
    weekLabel: "Free starter",
    description:
      "No gym required — just a pair of dumbbells and some floor space. Upper / lower split with a conditioning day to finish the week.",
    activeFrom: "2026-01-01",
    activeUntil: "2026-12-31",
    free: true,
    days: [
      {
        day: "Day 1",
        focus: "Upper — Push + Pull",
        exercises: [
          { name: "Dumbbell Bench Press (floor)", sets: "4", reps: "10–12" },
          { name: "Dumbbell Row", sets: "4", reps: "10–12 / side" },
          { name: "Dumbbell Shoulder Press", sets: "3", reps: "10–12" },
          { name: "Dumbbell Curl", sets: "3", reps: "12" },
          { name: "Dumbbell Skull Crusher", sets: "3", reps: "12" },
        ],
      },
      {
        day: "Day 2",
        focus: "Lower",
        exercises: [
          { name: "Dumbbell Goblet Squat", sets: "4", reps: "12" },
          { name: "Dumbbell Romanian Deadlift", sets: "4", reps: "12" },
          { name: "Dumbbell Walking Lunge", sets: "3", reps: "12 / leg" },
          { name: "Calf Raise (on a step)", sets: "3", reps: "15" },
        ],
      },
      {
        day: "Day 4",
        focus: "Upper — Volume",
        exercises: [
          { name: "Dumbbell Floor Press", sets: "4", reps: "12–15" },
          { name: "Dumbbell Pullover", sets: "3", reps: "12" },
          { name: "Dumbbell Lateral Raise", sets: "3", reps: "15" },
          { name: "Dumbbell Hammer Curl", sets: "3", reps: "12" },
          { name: "Push-Up", sets: "3", reps: "AMRAP" },
        ],
      },
      {
        day: "Day 5",
        focus: "Conditioning + Core",
        exercises: [
          { name: "Dumbbell Thruster", sets: "5", reps: "12", notes: "EMOM 10 min" },
          { name: "Dumbbell Swing", sets: "5", reps: "15" },
          { name: "Burpee", sets: "4", reps: "10" },
          { name: "Plank", sets: "3", reps: "45 sec" },
        ],
      },
    ],
  },
  {
    id: "free-conditioning",
    title: "Conditioning & Core",
    purpose: "Three short, equipment-free sessions to build engine and a strong midsection.",
    purposeTag: "Conditioning",
    weekLabel: "Free starter",
    description:
      "No weights, no gym. Three quick sessions you can do anywhere — perfect for travel days or as add-ons to your regular training.",
    activeFrom: "2026-01-01",
    activeUntil: "2026-12-31",
    free: true,
    days: [
      {
        day: "Day 1",
        focus: "Engine — Intervals",
        exercises: [
          { name: "Air Squat", sets: "5", reps: "20", notes: "40s work / 20s rest" },
          { name: "Push-Up", sets: "5", reps: "15" },
          { name: "Mountain Climber", sets: "5", reps: "40 sec" },
          { name: "Burpee", sets: "5", reps: "10" },
        ],
      },
      {
        day: "Day 2",
        focus: "Core Strength",
        exercises: [
          { name: "Hollow Body Hold", sets: "4", reps: "30 sec" },
          { name: "Plank", sets: "4", reps: "45 sec" },
          { name: "Side Plank", sets: "3", reps: "30 sec / side" },
          { name: "Reverse Crunch", sets: "3", reps: "15" },
          { name: "Superman Hold", sets: "3", reps: "30 sec" },
        ],
      },
      {
        day: "Day 3",
        focus: "AMRAP Finisher",
        exercises: [
          { name: "Burpee", sets: "1", reps: "AMRAP 12 min:", notes: "10 burpees, 15 squats, 20 mountain climbers — round repeat" },
        ],
      },
    ],
  },
];
