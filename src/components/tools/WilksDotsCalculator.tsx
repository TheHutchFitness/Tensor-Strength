"use client";

import { useState } from "react";
import { rankBreakdown, type Sex } from "./rankEstimator";

type Unit = "lb" | "kg";

// Official coefficients (source: IPF formula evaluation / OpenPowerlifting).

// DOTS — 4th-degree polynomial. DOTS = (500 / denominator) * total.
// denominator = c0 + c1*bw + c2*bw^2 + c3*bw^3 + c4*bw^4
const DOTS_MALE = [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093];
const DOTS_FEMALE = [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706];

// Wilks (legacy) — 5th-degree polynomial. Wilks = (500 / denominator) * total.
const WILKS_MALE = [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8];
const WILKS_FEMALE = [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8];

function polyDenom(coeff: number[], bw: number) {
  let denom = coeff[0];
  for (let i = 1; i < coeff.length; i++) {
    denom += coeff[i] * Math.pow(bw, i);
  }
  return denom;
}

export default function WilksDotsCalculator() {
  const [sex, setSex] = useState<Sex>("male");
  const [unit, setUnit] = useState<Unit>("lb");
  const [bodyweight, setBodyweight] = useState("200");
  const [total, setTotal] = useState("1200");
  const [age, setAge] = useState("30");
  const [result, setResult] = useState<null | { wilks: number; dots: number }>(null);
  const [rank, setRank] = useState<ReturnType<typeof rankBreakdown> | null>(null);

  function calculate(e: React.FormEvent) {
    e.preventDefault();
    const bwRaw = parseFloat(bodyweight);
    const totalRaw = parseFloat(total);
    if (!bwRaw || !totalRaw) return;
    const bwKg = unit === "lb" ? bwRaw / 2.2046 : bwRaw;
    const totalKg = unit === "lb" ? totalRaw / 2.2046 : totalRaw;

    // Clamp bodyweight to valid formula ranges
    const dotsBw = Math.min(Math.max(bwKg, 40), sex === "male" ? 210 : 150);
    const wilksBw = Math.min(
      Math.max(bwKg, sex === "male" ? 40 : 26.51),
      sex === "male" ? 201.9 : 154.53
    );

    const dotsCoeff = sex === "male" ? DOTS_MALE : DOTS_FEMALE;
    const wilksCoeff = sex === "male" ? WILKS_MALE : WILKS_FEMALE;

    const dots = (500 / polyDenom(dotsCoeff, dotsBw)) * totalKg;
    const wilks = (500 / polyDenom(wilksCoeff, wilksBw)) * totalKg;

    setResult({ wilks, dots });
    setRank(
      rankBreakdown({
        sex,
        bodyweightKg: bwKg,
        age: parseFloat(age) || undefined,
        totalKg,
      })
    );
  }

  const inputCls =
    "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <form onSubmit={calculate} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Unit</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className={inputCls + " mt-2"}>
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </label>
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Sex</span>
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)} className={inputCls + " mt-2"}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="font-display uppercase tracking-wider text-xs text-bone/70">Bodyweight ({unit})</span>
          <input type="number" value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} className={inputCls + " mt-2"} />
        </label>

        <label className="block">
          <span className="font-display uppercase tracking-wider text-xs text-bone/70">Squat + Bench + Deadlift Total ({unit})</span>
          <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} className={inputCls + " mt-2"} />
        </label>

        <label className="block">
          <span className="font-display uppercase tracking-wider text-xs text-bone/70">Age (for rank estimate)</span>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className={inputCls + " mt-2"} />
        </label>

        <button
          type="submit"
          className="mt-2 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
        >
          Calculate Scores
        </button>

        <p className="text-xs text-bone/40 leading-relaxed">
          Enter your three-lift total (squat + bench + deadlift) and bodyweight. DOTS is the
          modern standard used by most federations; Wilks is the legacy IPF formula. Both let
          you compare strength across bodyweights.
        </p>
      </form>

      <div className="bg-ink/40 border border-bone/15 p-8 flex flex-col justify-center gap-8">
        {result ? (
          <>
            <div>
              <p className="font-display uppercase tracking-wider text-xs text-bone/60 mb-2">DOTS Score</p>
              <p className="font-display text-5xl text-electric font-700 leading-none">
                {result.dots.toFixed(2)}
              </p>
              <p className="text-xs text-bone/50 mt-2">
                Modern formula · higher = stronger relative to bodyweight
              </p>
            </div>
            <div className="border-t border-bone/15 pt-6">
              <p className="font-display uppercase tracking-wider text-xs text-bone/60 mb-2">Wilks Score</p>
              <p className="font-display text-4xl text-bone font-700 leading-none">
                {result.wilks.toFixed(2)}
              </p>
              <p className="text-xs text-bone/50 mt-2">Legacy IPF formula</p>
            </div>

            {/* Rank estimate */}
            {rank?.overall && (
              <div className="border-t border-bone/15 pt-6">
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
                  For your total, {rank.bodyweightNote}, {rank.ageNote}.
                </p>
                <p className="text-[10px] text-bone/40 mt-2 italic">
                  Estimate based on published strength-standard tables, not an official world ranking.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-bone/50 text-center font-display uppercase tracking-wider text-sm">
            Enter your total and bodyweight to see your scores.
          </p>
        )}
      </div>
    </div>
  );
}
