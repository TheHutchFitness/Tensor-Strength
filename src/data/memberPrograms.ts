// Member-only training programs (paid Client Portal). These load straight into
// the workout tracker AND can be loaded as a full 4-week plan onto the member's
// calendar. Content mirrors the official Tensor 4-week PDFs (attached per program).

export type MPExercise = { exercise: string; sets: string; reps: string; rpe: string; notes: string };
export type MPSession = { id: string; title: string; exercises: MPExercise[] };
export type MemberProgram = {
  id: string;
  name: string;
  blurb: string;
  length: string;
  howTo: string;
  deloadable?: boolean;
  pdf?: string;          // downloadable full-program PDF (public path)
  weeks?: number;        // how many weeks the block runs (for calendar loading)
  daysPerWeek?: number;  // training days per week (for calendar loading)
  sessions: MPSession[];
};

export const memberPrograms: MemberProgram[] = [
  {
    id: "tensor-dup",
    name: "Tensor Strength DUP",
    blurb: "A 4-week daily-undulating strength block: heavy triples, a volume day and a speed/technique day that rotate the big lifts through different rep and intent zones.",
    length: "4 weeks · 3 days/week",
    howTo:
      "Run Day A (Heavy) · Day B (Volume) · Day C (Speed) each week for 4 weeks. Main-lift loads climb Wk1→Wk3 (Squat/Bench ~80%→85% 1RM, Deadlift ~77.5%→82.5%), then Wk4 keeps clean reps with ~25% less accessory volume — it is not a max-out week. Add 2.5–5 lb upper / 5–10 lb lower once you hit the top of a range at the target RPE.",
    deloadable: true,
    pdf: "/programs/tensor-strength-dup.pdf",
    weeks: 4,
    daysPerWeek: 3,
    sessions: [
      { id: "a", title: "Day A — Heavy Triples", exercises: [
        { exercise: "Broad Jump", sets: "3", reps: "3", rpe: "", notes: "Power primer before your first heavy lift. Stop if distance or landing quality drops." },
        { exercise: "Back Squat", sets: "4", reps: "3", rpe: "", notes: "Heavy triples @ ~80% 1RM (Wk1) → 82.5% → 85% → 85–87.5% (Wk4). Rest 3–5 min." },
        { exercise: "Bench Press", sets: "4", reps: "3", rpe: "", notes: "~80% 1RM Wk1, ramp to 85–87.5% by Wk4. Rest 3–5 min." },
        { exercise: "Deadlift", sets: "3", reps: "3", rpe: "", notes: "~77.5% 1RM Wk1 → 82.5% Wk3. Reset each rep. Rest 3–5 min." },
        { exercise: "Bulgarian Split Squat", sets: "3", reps: "8", rpe: "7", notes: "" },
        { exercise: "Chest-Supported Row", sets: "3", reps: "8", rpe: "7", notes: "" },
        { exercise: "DB Incline Press", sets: "3", reps: "8", rpe: "7", notes: "" },
        { exercise: "Hamstring Curl", sets: "3", reps: "10", rpe: "", notes: "" },
        { exercise: "Pallof Press", sets: "3", reps: "10/side", rpe: "", notes: "Resist rotation; ribs stacked over pelvis." },
        { exercise: "Farmer Carry", sets: "3", reps: "30–40 m", rpe: "", notes: "Heavy finisher. Tall posture, controlled steps." },
      ]},
      { id: "b", title: "Day B — Volume", exercises: [
        { exercise: "Med-Ball Slam", sets: "3", reps: "5", rpe: "", notes: "Explosive primer before lifting." },
        { exercise: "Front Squat", sets: "4", reps: "6", rpe: "", notes: "~67.5% 1RM Wk1 → 72.5% Wk3. Rest 2–3 min." },
        { exercise: "Bench Press", sets: "4", reps: "6", rpe: "", notes: "~70% 1RM Wk1 → 75% Wk3. Rest 2–3 min." },
        { exercise: "Romanian Deadlift", sets: "3", reps: "8", rpe: "7", notes: "" },
        { exercise: "Lat Pulldown", sets: "3", reps: "10", rpe: "", notes: "" },
        { exercise: "Walking Lunge", sets: "3", reps: "10/leg", rpe: "", notes: "" },
        { exercise: "DB Shoulder Press", sets: "3", reps: "10", rpe: "", notes: "" },
        { exercise: "Cable Row", sets: "3", reps: "12", rpe: "", notes: "" },
        { exercise: "Lateral Raise", sets: "2", reps: "15", rpe: "", notes: "" },
        { exercise: "Ab Wheel", sets: "3", reps: "8", rpe: "", notes: "" },
      ]},
      { id: "c", title: "Day C — Speed / Technique", exercises: [
        { exercise: "Box Jump", sets: "4", reps: "3", rpe: "", notes: "Land quiet and controlled." },
        { exercise: "Speed Squat", sets: "6", reps: "2", rpe: "", notes: "~60% 1RM Wk1 → 65–70% Wk3. Explosive intent; stop the set if the bar slows." },
        { exercise: "Speed Bench", sets: "6", reps: "3", rpe: "", notes: "~60% 1RM. Fast concentric on every rep." },
        { exercise: "Paused Deadlift", sets: "5", reps: "2", rpe: "", notes: "~60% 1RM. Pause without relaxing; keep tension and finish smoothly." },
        { exercise: "Pull-Up / Pulldown", sets: "4", reps: "6-8", rpe: "", notes: "" },
        { exercise: "Single-Leg RDL", sets: "3", reps: "8/leg", rpe: "", notes: "" },
        { exercise: "DB Bench", sets: "3", reps: "10", rpe: "", notes: "" },
        { exercise: "Face Pull", sets: "3", reps: "15", rpe: "", notes: "" },
        { exercise: "Copenhagen Plank", sets: "3", reps: "20s/side", rpe: "", notes: "Support the top leg on a bench; keep a straight line. Shorten the lever if needed." },
      ]},
    ],
  },
  {
    id: "tensor-starter",
    name: "Tensor Starter Strength",
    blurb: "A simple 4-week foundation for newer lifters: two alternating full-body workouts on machines and dumbbells, run three times a week with light conditioning.",
    length: "4 weeks · 3 days/week",
    howTo:
      "Alternate Workout A and B, 3 days a week (e.g. Mon/Wed/Fri) for 4 weeks. Start light at RPE 6 to learn the movements, then add a little load or one rep each week — Wk1 RPE 6 · Wk2 RPE 6–7 · Wk3 RPE 7–8 · Wk4 RPE 8. Add 2.5–5 lb upper / 5–10 lb lower whenever all reps are clean.",
    pdf: "/programs/tensor-starter.pdf",
    weeks: 4,
    daysPerWeek: 3,
    sessions: [
      { id: "a", title: "Workout A", exercises: [
        { exercise: "Goblet Squat", sets: "3", reps: "8", rpe: "6", notes: "Wk1 RPE 6 → Wk4 RPE 8. Learn the movement first." },
        { exercise: "Machine Chest Press", sets: "3", reps: "8", rpe: "", notes: "" },
        { exercise: "Lat Pulldown", sets: "3", reps: "8", rpe: "", notes: "" },
        { exercise: "DB Romanian Deadlift", sets: "2", reps: "10", rpe: "", notes: "" },
        { exercise: "Machine Shoulder Press", sets: "2", reps: "10", rpe: "", notes: "" },
        { exercise: "Seated Leg Curl", sets: "2", reps: "12", rpe: "", notes: "" },
        { exercise: "Plank", sets: "2", reps: "30s", rpe: "", notes: "" },
        { exercise: "Incline Treadmill Walk", sets: "1", reps: "5 min", rpe: "", notes: "Conditioning — keep a conversational pace." },
      ]},
      { id: "b", title: "Workout B", exercises: [
        { exercise: "Leg Press", sets: "3", reps: "10", rpe: "6", notes: "Wk1 RPE 6 → Wk4 RPE 8." },
        { exercise: "DB Bench Press", sets: "3", reps: "8", rpe: "", notes: "" },
        { exercise: "Cable Row", sets: "3", reps: "8", rpe: "", notes: "" },
        { exercise: "Roman Chair Hyperextension", sets: "2", reps: "10", rpe: "", notes: "" },
        { exercise: "Split Squat", sets: "2", reps: "8/leg", rpe: "", notes: "" },
        { exercise: "DB Lateral Raise", sets: "2", reps: "12", rpe: "", notes: "" },
        { exercise: "Dead Bug", sets: "2", reps: "8/side", rpe: "", notes: "" },
        { exercise: "Bike / Rower", sets: "1", reps: "6 min", rpe: "", notes: "Easy–moderate endurance." },
      ]},
    ],
  },
  {
    id: "tensor-high-volume",
    name: "Tensor High-Volume Hypertrophy",
    blurb: "A 4-week push/pull/legs hypertrophy block run twice a week (6 days) for members who want high weekly training volume. Control the eccentric, own the range, progress measurable output.",
    length: "4 weeks · 6 days/week",
    howTo:
      "Run Push A · Pull A · Legs A · Push B · Pull B · Legs B each week for 4 weeks. Wk1 base (finish sets with 2–3 reps in reserve) → Wk2 add a rep or 2.5–5% → Wk3 peak (add load + one set to priority moves) → Wk4 recovery (keep useful load, cut sets ~25–30%). Double progression: for 3×8–10, stay at the load until you hit 10/10/10 at the target RPE, then add weight and drop back near 8.",
    deloadable: true,
    pdf: "/programs/tensor-high-volume.pdf",
    weeks: 4,
    daysPerWeek: 6,
    sessions: [
      { id: "push-a", title: "Push A — Chest Emphasis", exercises: [
        { exercise: "Barbell Bench Press", sets: "4", reps: "6-8", rpe: "7", notes: "Rest 2–3 min." },
        { exercise: "Incline DB Bench", sets: "4", reps: "8-10", rpe: "", notes: "" },
        { exercise: "Machine Chest Press", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Seated DB Shoulder Press", sets: "3", reps: "8-10", rpe: "", notes: "" },
        { exercise: "Cable Fly", sets: "3", reps: "12-15", rpe: "", notes: "" },
        { exercise: "DB Lateral Raise", sets: "4", reps: "12-20", rpe: "", notes: "" },
        { exercise: "Rope Pushdown", sets: "4", reps: "10-15", rpe: "", notes: "" },
        { exercise: "OH Triceps Extension", sets: "3", reps: "12-15", rpe: "", notes: "" },
        { exercise: "Push-Up AMRAP", sets: "1", reps: "AMRAP", rpe: "", notes: "Finisher — stop when full-range reps break down." },
      ]},
      { id: "pull-a", title: "Pull A — Lat Emphasis", exercises: [
        { exercise: "Weighted Pull-Up / Pulldown", sets: "4", reps: "6-8", rpe: "", notes: "Rest 2–3 min." },
        { exercise: "Barbell Row", sets: "4", reps: "8", rpe: "7", notes: "" },
        { exercise: "Single-Arm Pulldown", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Chest-Supported Row", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Reverse Pec Deck", sets: "4", reps: "15", rpe: "", notes: "" },
        { exercise: "Incline DB Curl", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Hammer Curl", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Cable Curl", sets: "2", reps: "15-20", rpe: "", notes: "" },
        { exercise: "Farmer Carry", sets: "3", reps: "40-60 m", rpe: "", notes: "Finisher — heavy enough to challenge grip without losing posture." },
      ]},
      { id: "legs-a", title: "Legs A — Quad Emphasis", exercises: [
        { exercise: "Back Squat", sets: "4", reps: "6-8", rpe: "7", notes: "Rest 2–3 min." },
        { exercise: "Hack Squat", sets: "4", reps: "8-10", rpe: "", notes: "" },
        { exercise: "Bulgarian Split Squat", sets: "3", reps: "10/leg", rpe: "", notes: "" },
        { exercise: "Leg Extension", sets: "4", reps: "12-15", rpe: "", notes: "" },
        { exercise: "Leg Curl", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Standing Calf Raise", sets: "4", reps: "10-15", rpe: "", notes: "" },
        { exercise: "Tibialis Raise", sets: "3", reps: "15-20", rpe: "", notes: "" },
        { exercise: "Bodyweight Squat", sets: "1", reps: "50-100 total", rpe: "", notes: "Finisher — in as few clean sets as practical." },
      ]},
      { id: "push-b", title: "Push B — Shoulder Emphasis", exercises: [
        { exercise: "Barbell Overhead Press", sets: "4", reps: "6-8", rpe: "", notes: "Rest 2–3 min." },
        { exercise: "Incline Smith Press", sets: "4", reps: "8-10", rpe: "", notes: "" },
        { exercise: "DB Bench Press", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Machine Shoulder Press", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Cable Lateral Raise", sets: "4", reps: "15-20", rpe: "", notes: "" },
        { exercise: "Pec Deck", sets: "3", reps: "12-15", rpe: "", notes: "" },
        { exercise: "EZ-Bar Skull Crusher", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Cable Pushdown", sets: "3", reps: "15-20", rpe: "", notes: "" },
        { exercise: "Push-Up AMRAP", sets: "1", reps: "AMRAP", rpe: "", notes: "Finisher — 1 quality set, rigid torso, consistent depth." },
      ]},
      { id: "pull-b", title: "Pull B — Upper Back Emphasis", exercises: [
        { exercise: "Romanian Deadlift", sets: "3", reps: "6-8", rpe: "7", notes: "Rest 2–3 min." },
        { exercise: "Chest-Supported Upper Row", sets: "4", reps: "8-10", rpe: "", notes: "" },
        { exercise: "Neutral-Grip Pulldown", sets: "4", reps: "8-10", rpe: "", notes: "" },
        { exercise: "Cable Row", sets: "3", reps: "12", rpe: "", notes: "" },
        { exercise: "Face Pull", sets: "3", reps: "15-20", rpe: "", notes: "" },
        { exercise: "Preacher Curl", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Reverse Curl", sets: "3", reps: "12-15", rpe: "", notes: "" },
        { exercise: "Rear-Delt Fly", sets: "3", reps: "15-20", rpe: "", notes: "" },
        { exercise: "Farmer Carry", sets: "3", reps: "40-60 m", rpe: "", notes: "Finisher — progress distance before load if grip is the limiter." },
      ]},
      { id: "legs-b", title: "Legs B — Posterior Chain", exercises: [
        { exercise: "Front Squat", sets: "4", reps: "6-8", rpe: "", notes: "Rest 2–3 min." },
        { exercise: "Barbell RDL", sets: "4", reps: "8", rpe: "", notes: "" },
        { exercise: "Leg Press", sets: "3", reps: "10-12", rpe: "", notes: "" },
        { exercise: "Walking Lunge", sets: "3", reps: "12/leg", rpe: "", notes: "" },
        { exercise: "Seated Leg Curl", sets: "4", reps: "10-15", rpe: "", notes: "" },
        { exercise: "Adductor", sets: "3", reps: "15", rpe: "", notes: "" },
        { exercise: "Abductor", sets: "3", reps: "15", rpe: "", notes: "" },
        { exercise: "Seated Calf Raise", sets: "4", reps: "12-20", rpe: "", notes: "" },
        { exercise: "Bodyweight Squat", sets: "1", reps: "50-100 total", rpe: "", notes: "Finisher — controlled breathing, continuous rhythm." },
      ]},
    ],
  },
  {
    id: "tensor-high-intensity",
    name: "Tensor High-Intensity (HIT)",
    blurb: "A 4-week strength-endurance & conditioning block built around quality intervals. High breathing, controlled movement — density is the challenge, not grinding heavy singles.",
    length: "4 weeks · 3 days/week",
    howTo:
      "Rotate the 3 sessions each week for 4 weeks with at least a day between hard sessions. Keep resistance around RPE 6–8 — the short rest is the difficulty. Intervals progress Wk1 30s/30s (3 rounds) → Wk2 35s/25s → Wk3 40s/20s (4 rounds) → Wk4 45s/15s (4 rounds). You are progressing when you do more quality work in the same time — log reps, distance and rounds.",
    pdf: "/programs/tensor-high-intensity.pdf",
    weeks: 4,
    daysPerWeek: 3,
    sessions: [
      { id: "s1", title: "Session 1 — Full Body", exercises: [
        { exercise: "Med-Ball Slam", sets: "3", reps: "5", rpe: "", notes: "Warm-up — attack every rep with full intent." },
        { exercise: "Goblet Squat", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "Circuit @ ~RPE 6–8. Rest 90s between complete rounds. Wk1 30/30 → Wk4 45/15." },
        { exercise: "DB Bench Press", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "TRX or Cable Row", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "DB Romanian Deadlift", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "Push-Up", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "Record total push-ups; hold output across rounds." },
        { exercise: "Rower", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "Record distance; hold output across rounds." },
      ]},
      { id: "s2", title: "Session 2 — Lower + Engine", exercises: [
        { exercise: "Box Jump", sets: "3", reps: "3", rpe: "7", notes: "Land quiet and controlled; step down between reps." },
        { exercise: "Front Squat", sets: "3", reps: "6", rpe: "7", notes: "" },
        { exercise: "DB Romanian Deadlift", sets: "3", reps: "8", rpe: "7", notes: "" },
        { exercise: "Walking Lunge", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "Conditioning circuit. Wk1 30/30 → Wk4 45/15." },
        { exercise: "Kettlebell Swing", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "Hip hinge + explosive extension." },
        { exercise: "Step-Up", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "Bike", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "Sit-Up", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "Finisher", sets: "1", reps: "4 min", rpe: "", notes: "Alternate 10 bodyweight squats + 5 burpees for quality rounds." },
      ]},
      { id: "s3", title: "Session 3 — Upper + Athletic", exercises: [
        { exercise: "Med-Ball Chest Pass", sets: "3", reps: "5", rpe: "", notes: "Athletic prep." },
        { exercise: "Lateral Line Hop", sets: "3", reps: "15s", rpe: "", notes: "Quick, quiet hops for rhythm and ankle stiffness." },
        { exercise: "Single-Leg Balance Reach", sets: "2", reps: "5/side", rpe: "", notes: "" },
        { exercise: "DB Incline Press", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "Circuit. Wk1 30/30 → Wk4 45/15." },
        { exercise: "Lat Pulldown", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "DB Shoulder Press", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "Cable Row", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "Farmer Carry", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "Tall posture, level shoulders, short steps." },
        { exercise: "Battle Rope", sets: "3 rounds", reps: "30s work / 30s rest", rpe: "", notes: "" },
        { exercise: "Finisher", sets: "1", reps: "5 min", rpe: "", notes: "AMRAP: 8 push-ups + 10 sit-ups + 12 air squats. Record rounds + extra reps." },
      ]},
    ],
  },
];
