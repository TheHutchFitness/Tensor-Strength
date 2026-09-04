"use client";

import { useEffect, useMemo, useState } from "react";
import { estimateRank, type Sex } from "./rankEstimator";

type PR = {
  id: string;
  lift: string;
  weight: number;
  reps: number;
  unit: "lb" | "kg";
  date: string;
};

const STORAGE_KEY = "hutch-prs";
const PROFILE_KEY = "hutch-pr-profile";

type Profile = { sex: Sex; bodyweight: string; age: string; unit: "lb" | "kg" };

const DEFAULT_PROFILE: Profile = { sex: "male", bodyweight: "200", age: "30", unit: "lb" };

// Map common lift names to the rank estimator's lift keys.
function liftKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bench")) return "bench";
  if (n.includes("squat")) return "squat";
  if (n.includes("deadlift")) return "deadlift";
  if (n.includes("press") || n.includes("overhead") || n.includes("ohp")) return "overhead";
  return "default";
}

export default function PRTracker() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [lift, setLift] = useState("Back Squat");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [date, setDate] = useState("");
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrs(JSON.parse(raw));
      const p = localStorage.getItem(PROFILE_KEY);
      if (p) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(p) });
    } catch {}
  }, []);

  function save(list: PR[]) {
    setPrs(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function saveProfile(p: Profile) {
    setProfile(p);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    const r = parseFloat(reps);
    if (!w || !r) return;
    const entry: PR = {
      id: Math.random().toString(36).slice(2),
      lift,
      weight: w,
      reps: r,
      unit,
      date: date || new Date().toLocaleDateString(),
    };
    save([entry, ...prs]);
    setWeight("");
  }

  function remove(id: string) {
    save(prs.filter((p) => p.id !== id));
  }

  // Best per lift (heaviest weight)
  const bests = prs.reduce<Record<string, PR>>((acc, p) => {
    if (!acc[p.lift] || p.weight > acc[p.lift].weight) acc[p.lift] = p;
    return acc;
  }, {});

  // Rank per best lift (memoized)
  const ranks = useMemo(() => {
    const bwKg = profile.bodyweight
      ? profile.unit === "lb"
        ? parseFloat(profile.bodyweight) / 2.2046
        : parseFloat(profile.bodyweight)
      : 0;
    if (!bwKg) return {} as Record<string, ReturnType<typeof estimateRank>>;
    const out: Record<string, ReturnType<typeof estimateRank>> = {};
    for (const [name, pr] of Object.entries(bests)) {
      const liftKg = pr.unit === "lb" ? pr.weight / 2.2046 : pr.weight;
      out[name] = estimateRank({
        sex: profile.sex,
        bodyweightKg: bwKg,
        age: parseFloat(profile.age) || undefined,
        liftKg,
        liftName: liftKey(name),
      });
    }
    return out;
  }, [bests, profile]);

  const inputCls =
    "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";

  const presets = ["Back Squat", "Bench Press", "Deadlift", "Front Squat", "Overhead Press", "Pull-Up"];

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        {/* Profile for rank estimates */}
        <div className="border border-electric/30 bg-electric/5 p-4 mb-6">
          <p className="font-display uppercase tracking-wider text-xs text-electric mb-3">
            Your Profile (for rank estimates)
          </p>
          <div className="grid grid-cols-4 gap-3">
            <label className="block">
              <span className="font-display uppercase tracking-wider text-[10px] text-bone/60">Sex</span>
              <select
                value={profile.sex}
                onChange={(e) => saveProfile({ ...profile, sex: e.target.value as Sex })}
                className={inputCls + " mt-1 text-sm"}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-wider text-[10px] text-bone/60">Bodywt</span>
              <input
                type="number"
                value={profile.bodyweight}
                onChange={(e) => saveProfile({ ...profile, bodyweight: e.target.value })}
                className={inputCls + " mt-1 text-sm"}
              />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-wider text-[10px] text-bone/60">Age</span>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => saveProfile({ ...profile, age: e.target.value })}
                className={inputCls + " mt-1 text-sm"}
              />
            </label>
            <label className="block">
              <span className="font-display uppercase tracking-wider text-[10px] text-bone/60">Unit</span>
              <select
                value={profile.unit}
                onChange={(e) => saveProfile({ ...profile, unit: e.target.value as "lb" | "kg" })}
                className={inputCls + " mt-1 text-sm"}
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </label>
          </div>
        </div>

        <form onSubmit={add} className="grid gap-4">
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Lift</span>
            <input
              list="lifts"
              value={lift}
              onChange={(e) => setLift(e.target.value)}
              className={inputCls + " mt-2"}
            />
            <datalist id="lifts">
              {presets.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>

          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="font-display uppercase tracking-wider text-xs text-bone/70">Weight</span>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls + " mt-2"} required />
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

          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">Date (optional)</span>
            <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder={new Date().toLocaleDateString()} className={inputCls + " mt-2"} />
          </label>

          <button
            type="submit"
            className="mt-2 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
          >
            Log PR
          </button>
        </form>

        {Object.keys(bests).length > 0 && (
          <div className="mt-8 border-t border-bone/15 pt-6">
            <p className="glow font-display uppercase tracking-wider text-sm text-bone/70 mb-4">All-Time Bests</p>
            <ul className="grid gap-2">
              {Object.entries(bests).map(([name, pr]) => {
                const r = ranks[name];
                return (
                  <li key={name} className="flex flex-col gap-1 bg-ink/30 px-4 py-3 border border-bone/10">
                    <div className="flex justify-between items-center">
                      <span className="font-display uppercase tracking-wider text-sm">{name}</span>
                      <span className="font-display text-electric font-700">
                        {pr.weight} {pr.unit} × {pr.reps}
                      </span>
                    </div>
                    {r && (
                      <div className="flex items-center gap-2 text-[11px] text-bone/60">
                        <span className="font-display uppercase tracking-wider text-electric">
                          Top {r.topPercent}% · {r.tier}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="text-[10px] text-bone/40 mt-3 italic">
              Rank estimates use published strength-standard tables, not an official world ranking.
            </p>
          </div>
        )}
      </div>

      <div className="bg-ink/40 border border-bone/15 p-6">
        <p className="font-display uppercase tracking-wider text-sm text-bone/70 mb-4">PR History</p>
        {prs.length === 0 ? (
          <p className="text-bone/50 font-display uppercase tracking-wider text-sm">
            No PRs logged yet. Your records save on this device.
          </p>
        ) : (
          <ul className="grid gap-2 max-h-[420px] overflow-y-auto">
            {prs.map((p) => (
              <li key={p.id} className="flex items-center justify-between bg-ink/30 px-4 py-3 border border-bone/10">
                <div>
                  <p className="font-display uppercase tracking-wider text-sm">{p.lift}</p>
                  <p className="text-xs text-bone/50">{p.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-bone font-700">
                    {p.weight} {p.unit} × {p.reps}
                  </span>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-bone/40 hover:text-electric text-sm"
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
