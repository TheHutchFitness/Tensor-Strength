// Member-only training programs (paid Client Portal). These load straight into
// the workout tracker. Intentionally lower-key than The Hutch Touch — extra
// options for members to try, each roughly a 1-month block.

export type MPExercise = { exercise: string; sets: string; reps: string; rpe: string; notes: string };
export type MPSession = { id: string; title: string; exercises: MPExercise[] };
export type MemberProgram = {
  id: string;
  name: string;
  blurb: string;
  length: string;
  howTo: string;
  deloadable?: boolean;
  sessions: MPSession[];
};

export const memberPrograms: MemberProgram[] = [
  {
    id: "tensor-dup",
    name: "Tensor Strength DUP",
    blurb: "Daily Undulating Periodization — hit the big lifts several times a week at rotating rep ranges (heavy, moderate, volume) to drive strength fast.",
    length: "4 weeks · 4 days/week",
    howTo: "Run days A–D each week. Add ~2.5–5 lb to a lift whenever you hit all reps at the target RPE. Repeat the 4-week block.",
    deloadable: true,
    sessions: [
      { id: "a", title: "Day A — Heavy (Triples)", exercises: [
        { exercise: "Back Squat", sets: "4", reps: "3", rpe: "8", notes: "Heavy day. Leave 2 reps in the tank." },
        { exercise: "Bench Press", sets: "4", reps: "3", rpe: "8", notes: "Controlled, hard triples." },
        { exercise: "Barbell Row", sets: "3", reps: "6", rpe: "8", notes: "Strict, upper-back focus." },
        { exercise: "Weighted Dip", sets: "3", reps: "8", rpe: "8", notes: "" },
        { exercise: "Hanging Leg Raise", sets: "3", reps: "12", rpe: "8", notes: "" },
      ]},
      { id: "b", title: "Day B — Moderate (Fives)", exercises: [
        { exercise: "Deadlift", sets: "4", reps: "5", rpe: "7.5", notes: "Reset each rep. Own the position." },
        { exercise: "Overhead Press", sets: "4", reps: "5", rpe: "8", notes: "" },
        { exercise: "Front Squat", sets: "3", reps: "6", rpe: "8", notes: "" },
        { exercise: "Chin-Up", sets: "3", reps: "8", rpe: "8", notes: "Add load if easy." },
        { exercise: "Cable Fly", sets: "3", reps: "12", rpe: "8", notes: "" },
      ]},
      { id: "c", title: "Day C — Volume (Eights)", exercises: [
        { exercise: "Back Squat", sets: "4", reps: "8", rpe: "8", notes: "Volume day — lighter, more reps." },
        { exercise: "Incline Bench Press", sets: "4", reps: "8", rpe: "8", notes: "" },
        { exercise: "Romanian Deadlift", sets: "3", reps: "10", rpe: "8", notes: "" },
        { exercise: "Seated Cable Row", sets: "3", reps: "12", rpe: "8", notes: "" },
        { exercise: "Lateral Raise", sets: "3", reps: "15", rpe: "9", notes: "" },
      ]},
      { id: "d", title: "Day D — Power + Accessories", exercises: [
        { exercise: "Speed Deadlift", sets: "6", reps: "2", rpe: "6", notes: "Explosive, ~70%. Bar speed over load." },
        { exercise: "Speed Bench Press", sets: "6", reps: "3", rpe: "6", notes: "Fast concentric." },
        { exercise: "Walking Lunge", sets: "3", reps: "10", rpe: "8", notes: "Per leg." },
        { exercise: "Face Pull", sets: "3", reps: "15", rpe: "8", notes: "" },
        { exercise: "Barbell Curl", sets: "3", reps: "12", rpe: "9", notes: "" },
      ]},
    ],
  },
  {
    id: "tensor-starter",
    name: "Tensor Starter Strength",
    blurb: "A no-nonsense linear-progression barbell program for newer lifters. Two alternating full-body workouts, add weight every session.",
    length: "4 weeks · 3 days/week",
    howTo: "Alternate Workout A and B, 3 days a week (e.g. Mon/Wed/Fri). Add 5 lb to each lift every session while you can hit all reps. Deadlift is one work set.",
    sessions: [
      { id: "a", title: "Workout A", exercises: [
        { exercise: "Back Squat", sets: "3", reps: "5", rpe: "8", notes: "Add 5 lb from last A session." },
        { exercise: "Bench Press", sets: "3", reps: "5", rpe: "8", notes: "" },
        { exercise: "Deadlift", sets: "1", reps: "5", rpe: "8", notes: "One hard work set." },
      ]},
      { id: "b", title: "Workout B", exercises: [
        { exercise: "Back Squat", sets: "3", reps: "5", rpe: "8", notes: "Add 5 lb from last B session." },
        { exercise: "Overhead Press", sets: "3", reps: "5", rpe: "8", notes: "" },
        { exercise: "Barbell Row", sets: "3", reps: "5", rpe: "8", notes: "Or Power Clean if you're trained in it." },
      ]},
    ],
  },
  {
    id: "tensor-high-volume",
    name: "Tensor High-Volume Hypertrophy",
    blurb: "A high-volume, bodybuilding-style split for maximum muscle growth. Lots of sets, controlled reps, short rest.",
    length: "4 weeks · 4 days/week",
    howTo: "Run Push / Pull / Legs / Upper each week. Chase the top of each rep range with 1–2 reps left, then add reps or load. Keep rest 60–90s on accessories.",
    deloadable: true,
    sessions: [
      { id: "push", title: "Push (Chest / Shoulders / Triceps)", exercises: [
        { exercise: "Incline Bench Press", sets: "4", reps: "8-12", rpe: "8", notes: "" },
        { exercise: "Overhead Press", sets: "4", reps: "10-15", rpe: "8", notes: "" },
        { exercise: "Cable Fly", sets: "4", reps: "12-20", rpe: "9", notes: "" },
        { exercise: "Lateral Raise", sets: "4", reps: "15-25", rpe: "9", notes: "" },
        { exercise: "Triceps Pushdown", sets: "4", reps: "12-20", rpe: "9", notes: "" },
        { exercise: "Overhead Triceps Extension", sets: "3", reps: "12-15", rpe: "9", notes: "" },
      ]},
      { id: "pull", title: "Pull (Back / Rear Delts / Biceps)", exercises: [
        { exercise: "Weighted Chin-Up", sets: "4", reps: "8-12", rpe: "8", notes: "" },
        { exercise: "Barbell Row", sets: "4", reps: "8-12", rpe: "8", notes: "" },
        { exercise: "Lat Pulldown", sets: "4", reps: "12-15", rpe: "9", notes: "" },
        { exercise: "Seated Cable Row", sets: "3", reps: "12-15", rpe: "9", notes: "" },
        { exercise: "Rear Delt Fly", sets: "4", reps: "15-25", rpe: "9", notes: "" },
        { exercise: "Barbell Curl", sets: "4", reps: "10-15", rpe: "9", notes: "" },
      ]},
      { id: "legs", title: "Legs", exercises: [
        { exercise: "Back Squat", sets: "4", reps: "8-12", rpe: "8", notes: "" },
        { exercise: "Romanian Deadlift", sets: "4", reps: "10-12", rpe: "8", notes: "" },
        { exercise: "Leg Press", sets: "4", reps: "12-20", rpe: "9", notes: "" },
        { exercise: "Leg Curl", sets: "4", reps: "12-15", rpe: "9", notes: "" },
        { exercise: "Leg Extension", sets: "3", reps: "15-20", rpe: "9", notes: "" },
        { exercise: "Calf Raise", sets: "5", reps: "12-15", rpe: "9", notes: "" },
      ]},
      { id: "upper", title: "Upper (Pump / Weak Points)", exercises: [
        { exercise: "Dumbbell Bench Press", sets: "4", reps: "10-15", rpe: "8", notes: "" },
        { exercise: "Single-Arm Dumbbell Row", sets: "4", reps: "10-15", rpe: "8", notes: "" },
        { exercise: "Dumbbell Shoulder Press", sets: "3", reps: "12-15", rpe: "9", notes: "" },
        { exercise: "Cable Fly", sets: "3", reps: "15-20", rpe: "9", notes: "" },
        { exercise: "Hammer Curl", sets: "3", reps: "12-15", rpe: "9", notes: "" },
        { exercise: "Triceps Pushdown", sets: "3", reps: "15-20", rpe: "9", notes: "" },
      ]},
    ],
  },
  {
    id: "tensor-high-intensity",
    name: "Tensor High-Intensity (HIT)",
    blurb: "Low volume, brutally high effort. Few sets taken to true failure, full-body, 3 short sessions a week — maximum stimulus, maximum recovery.",
    length: "4 weeks · 3 days/week",
    howTo: "Rotate sessions 1–3 with at least a rest day between. Every work set is taken to technical failure (RPE 10). One set is enough — earn your recovery. Add load next time when you beat the rep target.",
    sessions: [
      { id: "s1", title: "Session 1 — Full Body", exercises: [
        { exercise: "Leg Press", sets: "1", reps: "12-20", rpe: "10", notes: "To failure. Optional rest-pause." },
        { exercise: "Bench Press", sets: "1", reps: "6-10", rpe: "10", notes: "To failure with a spotter." },
        { exercise: "Lat Pulldown", sets: "1", reps: "8-12", rpe: "10", notes: "To failure." },
        { exercise: "Overhead Press", sets: "1", reps: "6-10", rpe: "10", notes: "" },
        { exercise: "Leg Curl", sets: "1", reps: "10-15", rpe: "10", notes: "" },
      ]},
      { id: "s2", title: "Session 2 — Full Body", exercises: [
        { exercise: "Hack Squat", sets: "1", reps: "12-20", rpe: "10", notes: "To failure." },
        { exercise: "Incline Bench Press", sets: "1", reps: "6-10", rpe: "10", notes: "" },
        { exercise: "Seated Cable Row", sets: "1", reps: "8-12", rpe: "10", notes: "" },
        { exercise: "Lateral Raise", sets: "1", reps: "12-20", rpe: "10", notes: "" },
        { exercise: "Calf Raise", sets: "1", reps: "12-20", rpe: "10", notes: "" },
      ]},
      { id: "s3", title: "Session 3 — Full Body", exercises: [
        { exercise: "Romanian Deadlift", sets: "1", reps: "8-12", rpe: "10", notes: "To failure with clean technique." },
        { exercise: "Weighted Dip", sets: "1", reps: "6-10", rpe: "10", notes: "" },
        { exercise: "Chin-Up", sets: "1", reps: "6-10", rpe: "10", notes: "To failure; add load if needed." },
        { exercise: "Leg Extension", sets: "1", reps: "12-20", rpe: "10", notes: "" },
        { exercise: "Barbell Curl", sets: "1", reps: "8-12", rpe: "10", notes: "" },
      ]},
    ],
  },
];
