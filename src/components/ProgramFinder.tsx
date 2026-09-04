"use client";

import { useState } from "react";

type Goal = "strength" | "muscle" | "fatloss" | "health";
type Days = 3 | 4 | 5 | 6;
type Equipment = "fullgym" | "home" | "bodyweight";
type Experience = "beginner" | "intermediate" | "advanced";

type Result = {
  split: string;
  structure: string;
  reps: string;
  volume: string;
  intensity: string;
  extras: string;
  summary: string;
};

function recommend(
  goal: Goal,
  days: Days,
  equipment: Equipment,
  experience: Experience
): Result {
  // Split by days
  const splitByDays: Record<Days, string> = {
    3: "Full-Body — 3 sessions / week",
    4: "Upper / Lower — 4 sessions / week",
    5: "Push / Pull / Legs + Upper/Lower — 5 sessions",
    6: "Push / Pull / Legs ×2 — 6 sessions",
  };

  // Reps by goal
  const repsByGoal: Record<Goal, string> = {
    strength: "3–6 reps on the big compounds, 6–10 on accessories",
    muscle: "6–10 reps on compounds, 10–15 on accessories",
    fatloss: "4–8 reps to preserve strength, 10–15 on accessories",
    health: "8–12 reps across the board, moderate effort",
  };

  // Volume by experience
  const volumeByExp: Record<Experience, string> = {
    beginner: "10–12 working sets per muscle group per week",
    intermediate: "14–18 working sets per muscle group per week",
    advanced: "18–24 working sets per muscle group per week",
  };

  // Intensity by goal
  const intensityByGoal: Record<Goal, string> = {
    strength: "RPE 8–9 on top sets; leave 1–2 reps in reserve",
    muscle: "RPE 7–9; train close to failure on the last set of each exercise",
    fatloss: "RPE 7–8; maintain intensity to hold onto strength in a deficit",
    health: "RPE 6–7; challenging but sustainable",
  };

  // Extras
  const extrasByGoal: Record<Goal, string> = {
    strength: "Deload every 4th week. Test maxes at the end of each block.",
    muscle: "Progressive overload weekly — add reps, then weight. Deload every 5–6 weeks.",
    fatloss: "Add 2–3 conditioning sessions (20–30 min). Protein at ~1g/lb bodyweight.",
    health: "Walk daily. 2 mobility sessions. Consistency beats intensity here.",
  };

  // Equipment note
  const equipNote: Record<Equipment, string> = {
    fullgym: "Barbell compounds as your main lifts; machines and cables for accessory volume.",
    home: "Dumbbell variations of the main lifts; bodyweight for accessories and conditioning.",
    bodyweight: "Calisthenics progressions — push-ups, pull-ups, squats, hinges, core. Add a band if you can.",
  };

  const goalWord: Record<Goal, string> = {
    strength: "strength",
    muscle: "muscle",
    fatloss: "fat loss",
    health: "general health",
  };

  const summary = `A ${days}-day ${splitByDays[days].split("—")[0].trim()} built for ${goalWord[goal]}${experience === "beginner" ? ", scaled for a beginner" : experience === "advanced" ? ", with advanced volume" : ""}. ${equipNote[equipment]}`;

  return {
    split: splitByDays[days],
    structure: equipNote[equipment],
    reps: repsByGoal[goal],
    volume: volumeByExp[experience],
    intensity: intensityByGoal[goal],
    extras: extrasByGoal[goal],
    summary,
  };
}

export default function ProgramFinder() {
  const [goal, setGoal] = useState<Goal>("strength");
  const [days, setDays] = useState<Days>(4);
  const [equipment, setEquipment] = useState<Equipment>("fullgym");
  const [experience, setExperience] = useState<Experience>("intermediate");
  const [result, setResult] = useState<Result | null>(null);

  function calculate(e: React.FormEvent) {
    e.preventDefault();
    setResult(recommend(goal, days, equipment, experience));
  }

  const inputCls =
    "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";

  return (
    <section id="program-finder" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-10">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Program Finder
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Find your
            <br />
            <span className="text-electric">framework.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            Answer four questions and get the training structure that fits your goal,
            schedule, and gear. This is the <em>framework</em> — the split, the reps, the
            volume, the intensity. The actual program (which exercises, what weights, when
            to progress) is what Hutch builds for you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <form onSubmit={calculate} className="grid gap-4">
            <label className="block">
              <span className="font-display uppercase tracking-wider text-xs text-bone/70">Primary goal</span>
              <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)} className={inputCls + " mt-2"}>
                <option value="strength">Build strength</option>
                <option value="muscle">Build muscle</option>
                <option value="fatloss">Lose fat / recomp</option>
                <option value="health">General health &amp; fitness</option>
              </select>
            </label>

            <label className="block">
              <span className="font-display uppercase tracking-wider text-xs text-bone/70">Days per week</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value) as Days)} className={inputCls + " mt-2"}>
                <option value={3}>3 days</option>
                <option value={4}>4 days</option>
                <option value={5}>5 days</option>
                <option value={6}>6 days</option>
              </select>
            </label>

            <label className="block">
              <span className="font-display uppercase tracking-wider text-xs text-bone/70">Equipment</span>
              <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)} className={inputCls + " mt-2"}>
                <option value="fullgym">Full gym (barbell + machines)</option>
                <option value="home">Home gym (dumbbells)</option>
                <option value="bodyweight">Bodyweight only</option>
              </select>
            </label>

            <label className="block">
              <span className="font-display uppercase tracking-wider text-xs text-bone/70">Experience</span>
              <select value={experience} onChange={(e) => setExperience(e.target.value as Experience)} className={inputCls + " mt-2"}>
                <option value="beginner">Beginner (under 1 year)</option>
                <option value="intermediate">Intermediate (1–3 years)</option>
                <option value="advanced">Advanced (3+ years)</option>
              </select>
            </label>

            <button
              type="submit"
              className="mt-2 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
            >
              Get My Framework
            </button>
          </form>

          <div className="bg-ink/40 border border-bone/15 p-6 md:p-8">
            {result ? (
              <>
                <p className="font-display uppercase tracking-wider text-xs text-bone/60 mb-3">
                  Your framework
                </p>
                <p className="text-bone/85 leading-relaxed text-sm mb-6">{result.summary}</p>

                <dl className="grid gap-4">
                  <Row label="Split" value={result.split} />
                  <Row labelEquipment label="Equipment focus" value={result.structure} />
                  <Row label="Rep ranges" value={result.reps} />
                  <Row label="Volume" value={result.volume} />
                  <Row label="Intensity" value={result.intensity} />
                  <Row label="Extras" value={result.extras} />
                </dl>

                <div className="mt-8 border-t border-bone/15 pt-6">
                  <p className="font-display uppercase tracking-wider text-sm text-electric mb-3">
                    ⚡ This is the framework. The program is the hard part.
                  </p>
                  <p className="text-xs text-bone/60 leading-relaxed mb-4">
                    Which exercises for your build, what weights to start at, when to add
                    weight, how to adjust when life happens — that&apos;s what Hutch builds
                    around your actual lifts, gear, and goals.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="/#program"
                      className="bg-electric text-ink px-5 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors text-center"
                    >
                      Get a Custom Program — $200 →
                    </a>
                    <a
                      href="/#contact"
                      className="border-2 border-bone px-5 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone hover:text-ink transition-colors text-center"
                    >
                      Apply for Coaching
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-bone/50 text-center font-display uppercase tracking-wider text-sm self-center">
                Answer the four questions to see your framework.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  labelEquipment,
}: {
  label: string;
  value: string;
  labelEquipment?: boolean;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="font-display uppercase tracking-wider text-[10px] text-bone/50 pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-bone/85 leading-relaxed">{value}</dd>
    </div>
  );
}
