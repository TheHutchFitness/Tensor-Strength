"use client";

import { useState } from "react";
import { cloudSet } from "@/lib/cloud";

type Sex = "male" | "female";
type Goal = "cut" | "maintain" | "bulk";
type Activity = "sedentary" | "light" | "moderate" | "active" | "athlete";

const activityFactors: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

const goalAdjust: Record<Goal, number> = {
  cut: -500,
  maintain: 0,
  bulk: 400,
};

function bmr(sex: Sex, weightKg: number, heightCm: number, age: number) {
  // Mifflin-St Jeor
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export default function MacroCalculator() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("30");
  const [weight, setWeight] = useState("180");
  const [height, setHeight] = useState("175");
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<null | {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(null);

  function calculate(e: React.FormEvent) {
    e.preventDefault();
    const ageN = parseFloat(age);
    const weightLb = parseFloat(weight);
    const heightCm = parseFloat(height);
    if (!ageN || !weightLb || !heightCm) return;
    const weightKg = unit === "lb" ? weightLb / 2.2046 : weightLb;
    const maintenance = bmr(sex, weightKg, heightCm, ageN) * activityFactors[activity];
    const calories = Math.round(maintenance + goalAdjust[goal]);
    // Protein: 1g per lb bodyweight; Fat: 25% of cals; Carbs: remainder
    const protein = Math.round(weightLb);
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
    setResult({ calories, protein, carbs, fat });
  }

  const inputCls =
    "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <form onSubmit={calculate} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Unit</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as "lb" | "kg")}
              className={inputCls + " mt-2"}
            >
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </label>
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Sex</span>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex)}
              className={inputCls + " mt-2"}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Age</span>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className={inputCls + " mt-2"} />
          </label>
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Weight ({unit})</span>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls + " mt-2"} />
          </label>
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Height (cm)</span>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls + " mt-2"} />
          </label>
        </div>

        <label className="block">
          <span className="font-display uppercase tracking-wider text-xs text-bone/70">Activity level</span>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as Activity)}
            className={inputCls + " mt-2"}
          >
            <option value="sedentary">Sedentary — desk job, little exercise</option>
            <option value="light">Light — 1–3 sessions/week</option>
            <option value="moderate">Moderate — 3–5 sessions/week</option>
            <option value="active">Active — 6+ sessions/week</option>
            <option value="athlete">Athlete — 2x/day, physical job</option>
          </select>
        </label>

        <label className="block">
          <span className="font-display uppercase tracking-wider text-xs text-bone/70">Goal</span>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
            className={inputCls + " mt-2"}
          >
            <option value="cut">Cut — fat loss (-500 cal)</option>
            <option value="maintain">Maintain — recomp / hold</option>
            <option value="bulk">Bulk — muscle gain (+400 cal)</option>
          </select>
        </label>

        <button
          type="submit"
          className="mt-2 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
        >
          Calculate Macros
        </button>
      </form>

      <div className="bg-ink/40 border border-bone/15 p-8 flex flex-col justify-center">
        {result ? (
          <>
            <p className="font-display uppercase tracking-wider text-xs text-bone/60 mb-2">Daily Target</p>
            <p className="font-display text-5xl text-electric font-700 leading-none">
              {result.calories.toLocaleString()}
            </p>
            <p className="text-sm text-bone/60 mt-1">calories / day</p>

            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-bone/15 pt-6">
              {[
                { n: result.protein, l: "Protein", u: "g" },
                { n: result.carbs, l: "Carbs", u: "g" },
                { n: result.fat, l: "Fat", u: "g" },
              ].map((m) => (
                <div key={m.l}>
                  <p className="font-display text-2xl text-bone font-700">{m.n}{m.u}</p>
                  <p className="text-xs uppercase tracking-wider text-bone/60 mt-1">{m.l}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-bone/40 leading-relaxed">
              Estimates based on Mifflin-St Jeor. Protein set at ~1g per lb bodyweight,
              fat at 25% of calories, carbs fill the rest. Adjust to your real-world results.
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  cloudSet(
                    "ts-nutrition-goal",
                    { calories: result.calories, protein: result.protein, carbs: result.carbs, fat: result.fat }
                  );
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                } catch {}
              }}
              className="mt-5 w-full bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
            >
              {saved ? "✓ Saved as tracker goals" : "Use as my tracker goals →"}
            </button>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-bone/40 text-center">
              Sets your Nutrition Tracker daily targets across your devices.
            </p>
          </>
        ) : (
          <p className="text-bone/50 text-center font-display uppercase tracking-wider text-sm">
            Enter your stats and hit calculate.
          </p>
        )}
      </div>
    </div>
  );
}
