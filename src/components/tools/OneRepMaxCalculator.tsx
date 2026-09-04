"use client";

import { useState } from "react";
import { rankBreakdown, type Sex } from "./rankEstimator";

function epley(w: number, r: number) {
  return w * (1 + r / 30);
}
function brzycki(w: number, r: number) {
  return w * (36 / (37 - r));
}

export default function OneRepMaxCalculator() {
  const [weight, setWeight] = useState("225");
  const [reps, setReps] = useState("5");
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [sex, setSex] = useState<Sex>("male");
  const [bodyweight, setBodyweight] = useState("200");
  const [age, setAge] = useState("30");
  const [liftName, setLiftName] = useState("bench");
  const [result, setResult] = useState<null | {
    avg: number;
    epley: number;
    brzycki: number;
    table: { reps: number; weight: number }[];
  }>(null);
  const [rank, setRank] = useState<ReturnType<typeof rankBreakdown> | null>(null);

  function calculate(ev: React.FormEvent) {
    ev.preventDefault();
    const w = parseFloat(weight);
    const r = parseFloat(reps);
    if (!w || !r || r < 1 || r > 15) return;
    const e = epley(w, r);
    const b = brzycki(w, r);
    const avg = (e + b) / 2;
    const table = [1, 2, 3, 5, 8, 10, 12].map((rpct) => ({
      reps: rpct,
      weight: avg * (1 - rpct * 0.025),
    }));
    setResult({ avg, epley: e, brzycki: b, table });

    // Rank estimate
    const liftKg = unit === "lb" ? avg / 2.2046 : avg;
    const bwKg = parseFloat(bodyweight) ? (unit === "lb" ? parseFloat(bodyweight) / 2.2046 : parseFloat(bodyweight)) : 0;
    const ageN = parseFloat(age) || 0;
    if (bwKg > 0) {
      // Map the selected lift to the rank estimator's baseline key.
      const estimatorKey =
        liftName === "frontsquat"
          ? "squat"
          : liftName === "sumodeadlift"
          ? "deadlift"
          : liftName;
      setRank(
        rankBreakdown({
          sex,
          bodyweightKg: bwKg,
          age: ageN || undefined,
          liftKg,
          liftName: estimatorKey,
        })
      );
    } else {
      setRank(null);
    }
  }

  const inputCls =
    "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <form onSubmit={calculate} className="grid gap-4">
        <label className="block">
          <span className="font-display uppercase tracking-wider text-xs text-bone/70">Lift</span>
          <select value={liftName} onChange={(e) => setLiftName(e.target.value)} className={inputCls + " mt-2"}>
            <option value="bench">Bench Press</option>
            <option value="backsquat">Back Squat</option>
            <option value="frontsquat">Front Squat</option>
            <option value="deadlift">Deadlift (Conventional)</option>
            <option value="sumodeadlift">Sumo Deadlift</option>
            <option value="overhead">Overhead Press</option>
          </select>
        </label>

        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Weight ({unit})</span>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls + " mt-2"} />
          </label>
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Reps</span>
            <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className={inputCls + " mt-2"} />
          </label>
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Unit</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value as "lb" | "kg")} className={inputCls + " mt-2"}>
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </label>
        </div>

        {/* Profile for rank estimate */}
        <div className="grid grid-cols-3 gap-4 border-t border-bone/15 pt-4">
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Sex</span>
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)} className={inputCls + " mt-2"}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Bodyweight ({unit})</span>
            <input type="number" value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} className={inputCls + " mt-2"} />
          </label>
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Age</span>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className={inputCls + " mt-2"} />
          </label>
        </div>

        <button
          type="submit"
          className="mt-2 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
        >
          Estimate 1RM
        </button>
        <p className="text-xs text-bone/40 leading-relaxed">
          Use a weight you moved for 1–15 reps with good form. Add your sex, bodyweight, and
          age for an estimated population rank.
        </p>
      </form>

      <div className="bg-ink/40 border border-bone/15 p-8">
        {result ? (
          <>
            <p className="font-display uppercase tracking-wider text-xs text-bone/60 mb-2">Estimated 1-Rep Max</p>
            <p className="font-display text-5xl text-electric font-700 leading-none">
              {Math.round(result.avg)} <span className="text-2xl text-bone/60">{unit}</span>
            </p>
            <p className="text-xs text-bone/50 mt-2">
              Epley: {Math.round(result.epley)} {unit} · Brzycki: {Math.round(result.brzycki)} {unit}
            </p>

            {/* Rank estimate */}
            {rank?.overall && (
              <div className="mt-6 border-2 border-electric bg-electric/10 p-4">
                <p className="font-display uppercase tracking-wider text-xs text-electric mb-1">
                  Estimated Rank
                </p>
                <p className="font-display text-3xl text-bone font-700 leading-none">
                  Top {rank.overall.topPercent}%
                </p>
                <p className="font-display uppercase tracking-wider text-sm text-electric mt-2">
                  {rank.overall.tier}
                </p>
                <p className="text-xs text-bone/70 mt-2 leading-relaxed">{rank.overall.blurb}</p>
                <p className="text-[11px] text-bone/50 mt-2 leading-relaxed">
                  For your lift, {rank.bodyweightNote}, {rank.ageNote}.
                </p>
                <p className="text-[10px] text-bone/40 mt-2 italic">
                  Estimate based on published strength-standard tables, not an official world ranking.
                </p>
              </div>
            )}

            <table className="mt-6 w-full text-sm border-t border-bone/15">
              <thead>
                <tr className="text-bone/60">
                  <th className="text-left py-2 font-display uppercase tracking-wider text-xs">Reps</th>
                  <th className="text-right py-2 font-display uppercase tracking-wider text-xs">Target {unit}</th>
                </tr>
              </thead>
              <tbody>
                {result.table.map((row) => (
                  <tr key={row.reps} className="border-t border-bone/10">
                    <td className="py-2 text-bone/80">{row.reps}</td>
                    <td className="py-2 text-right text-bone font-display">{Math.round(row.weight)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-bone/50 text-center font-display uppercase tracking-wider text-sm">
            Enter a weight and rep count.
          </p>
        )}
      </div>
    </div>
  );
}
