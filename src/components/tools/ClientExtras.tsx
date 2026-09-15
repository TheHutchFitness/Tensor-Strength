"use client";

import { useEffect, useMemo, useState } from "react";
import { useCloudState } from "@/lib/cloud";

type Tab = "records" | "calendar" | "bodyweight" | "habits" | "deload" | "warmup" | "plate";
const card = "border border-bone/15 bg-ink/20 p-5";
const label = "block text-[11px] uppercase tracking-wider text-bone/50 mb-1 font-display";
const input = "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none min-w-0";
const btn = "font-display uppercase tracking-wider text-sm bg-electric text-ink px-5 py-2.5 hover:bg-bone transition-colors disabled:opacity-50";
const ghost = "font-display uppercase tracking-wider text-xs border border-bone/25 text-bone/70 px-4 py-2 hover:border-electric hover:text-electric transition-colors";

const WORKOUT_KEY = "hutch-workouts";
const e1rm = (w: number, r: number) => (w > 0 && r > 0 ? Math.round(w * (1 + r / 30)) : 0);
function loadWorkouts(): any[] {
  try { const s = localStorage.getItem(WORKOUT_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}

/* ---------- Personal Records Board ---------- */
function Records() {
  const [rows, setRows] = useState<{ name: string; e1rm: number; date: string }[]>([]);
  useEffect(() => {
    const best: Record<string, { e1rm: number; date: string }> = {};
    for (const w of loadWorkouts()) {
      for (const ex of w.exercises || []) {
        const e = (ex.sets || []).reduce((m: number, s: any) => Math.max(m, e1rm(parseFloat(s.weight), parseFloat(s.reps))), 0);
        const k = (ex.name || "").trim();
        if (k && e > (best[k]?.e1rm || 0)) best[k] = { e1rm: e, date: w.date };
      }
    }
    setRows(Object.entries(best).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.e1rm - a.e1rm));
  }, []);
  if (!rows.length) return <p className="text-bone/50 text-sm">Log some workouts and your best estimated 1RM per lift shows up here.</p>;
  return (
    <div className={card + " overflow-x-auto"}>
      <table className="w-full text-sm">
        <thead><tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15"><th className="text-left py-2">Lift</th><th className="text-right py-2">Est. 1RM</th><th className="text-right py-2">Set on</th></tr></thead>
        <tbody>{rows.map((r) => (<tr key={r.name} className="border-b border-bone/5"><td className="py-2.5 font-display uppercase tracking-wider text-bone">{r.name}</td><td className="text-right font-display text-electric">{r.e1rm} lb</td><td className="text-right text-bone/50 text-xs">{r.date}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

/* ---------- Consistency Calendar ---------- */
function Calendar() {
  const days = useMemo(() => {
    const set = new Set<string>();
    for (const w of loadWorkouts()) { const d = new Date(w.date); if (!isNaN(d.getTime())) set.add(d.toISOString().slice(0, 10)); }
    const out: { key: string; on: boolean }[] = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); out.push({ key, on: set.has(key) }); }
    return out;
  }, []);
  const total = days.filter((d) => d.on).length;
  // current streak
  let streak = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i].on) streak++; else break; }
  return (
    <div className="grid gap-4 max-w-lg">
      <div className="flex gap-6">
        <div className={card + " flex-1 text-center"}><p className="text-3xl font-display text-electric">{total}</p><p className="text-[10px] uppercase tracking-wider text-bone/50">Sessions (12 wks)</p></div>
        <div className={card + " flex-1 text-center"}><p className="text-3xl font-display text-electric">{streak}🔥</p><p className="text-[10px] uppercase tracking-wider text-bone/50">Current streak</p></div>
      </div>
      <div className={card}>
        <div className="grid grid-cols-[repeat(12,1fr)] gap-1">
          {days.map((d) => (<div key={d.key} title={d.key} className={"aspect-square " + (d.on ? "bg-electric" : "bg-bone/10")} />))}
        </div>
        <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-2">Each square = a day · bright = you trained</p>
      </div>
    </div>
  );
}

/* ---------- Deload / Readiness Check ---------- */
function Deload() {
  const q = [
    { k: "sleep", label: "Sleep quality" },
    { k: "soreness", label: "Muscle soreness" },
    { k: "energy", label: "Energy / motivation" },
    { k: "joints", label: "Joint / niggle pain" },
  ];
  const [v, setV] = useState<Record<string, number>>({ sleep: 3, soreness: 3, energy: 3, joints: 3 });
  // higher soreness/joints = worse, so invert those
  const score = v.sleep + v.energy + (6 - v.soreness) + (6 - v.joints); // out of 20
  const rec = score >= 16 ? { t: "Green — push hard", c: "text-electric" } : score >= 11 ? { t: "Amber — train, but cap top sets", c: "text-amber-400" } : { t: "Red — deload or active recovery", c: "text-red-400" };
  return (
    <div className="grid gap-4 max-w-lg">
      {q.map((item) => (
        <div key={item.k}>
          <label className={label}>{item.label} <span className="text-bone/30">({v[item.k]}/5)</span></label>
          <input type="range" min={1} max={5} value={v[item.k]} onChange={(e) => setV((s) => ({ ...s, [item.k]: parseInt(e.target.value) }))} className="w-full accent-[#3d8cff]" />
        </div>
      ))}
      <div className={card + " text-center"}>
        <p className="text-[10px] uppercase tracking-wider text-bone/50">Readiness</p>
        <p className="text-4xl font-display text-electric">{score}<span className="text-lg text-bone/40">/20</span></p>
        <p className={"font-display uppercase tracking-wider text-sm mt-1 " + rec.c}>{rec.t}</p>
      </div>
    </div>
  );
}

/* ---------- Warm-up Generator ---------- */
function Warmup() {
  const [lift, setLift] = useState("Squat");
  const [top, setTop] = useState("315");
  const sets = useMemo(() => {
    const w = parseFloat(top) || 0; if (!w) return [];
    const round = (x: number) => Math.round(x / 5) * 5;
    return [
      { pct: "Empty bar", load: "bar", reps: 8 },
      { pct: "40%", load: round(w * 0.4), reps: 5 },
      { pct: "60%", load: round(w * 0.6), reps: 3 },
      { pct: "75%", load: round(w * 0.75), reps: 2 },
      { pct: "90%", load: round(w * 0.9), reps: 1 },
    ];
  }, [top]);
  return (
    <div className="grid gap-4 max-w-lg">
      <div className="grid grid-cols-2 gap-2">
        <div><label className={label}>Lift</label><input className={input} value={lift} onChange={(e) => setLift(e.target.value)} /></div>
        <div><label className={label}>Top working set (lb)</label><input className={input} inputMode="decimal" value={top} onChange={(e) => setTop(e.target.value)} /></div>
      </div>
      <div className={card}>
        <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-3">Ramp-up for {lift}</p>
        <div className="grid gap-2">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center justify-between border-b border-bone/5 py-2">
              <span className="text-bone/60 text-sm">{s.pct}</span>
              <span className="font-display text-bone">{s.load === "bar" ? "Empty bar" : `${s.load} lb`} × {s.reps}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-bone/40 mt-3">Add 5–8 min general cardio + dynamic mobility for the working muscles before the bar.</p>
      </div>
    </div>
  );
}

/* ---------- Bodyweight & measurements ---------- */
function Bodyweight() {
  const KEY = "ts-bodyweight";
  const [rows, save] = useCloudState<{ date: string; weight: number; waist?: number }[]>(KEY, []);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");

  const add = () => {
    const w = parseFloat(weight); if (!w) return;
    const date = new Date().toISOString().slice(0, 10);
    const next = [...rows.filter((r) => r.date !== date), { date, weight: w, waist: parseFloat(waist) || undefined }].sort((a, b) => a.date.localeCompare(b.date));
    save(next); setWeight(""); setWaist("");
  };

  const chart = useMemo(() => {
    if (rows.length < 2) return null;
    const vals = rows.map((r) => r.weight); const min = Math.min(...vals), max = Math.max(...vals), rng = max - min || 1;
    const W = 300, H = 90, pad = 8;
    const pts = rows.map((r, i) => `${pad + (i * (W - pad * 2)) / (rows.length - 1)},${(H - pad - ((r.weight - min) / rng) * (H - pad * 2)).toFixed(1)}`).join(" ");
    return { pts, min, max, W, H };
  }, [rows]);

  const delta = rows.length >= 2 ? +(rows[rows.length - 1].weight - rows[0].weight).toFixed(1) : 0;

  return (
    <div className="grid gap-4 max-w-lg">
      <div className="grid grid-cols-2 gap-2 items-end">
        <div><label className={label}>Weight (lb)</label><input className={input} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
        <div><label className={label}>Waist (in, optional)</label><input className={input} inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} /></div>
      </div>
      <button className={btn} onClick={add} disabled={!weight}>Log today</button>
      {chart && (
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-display uppercase tracking-wider text-bone/60 text-xs">Weight trend</p>
            <span className={"text-xs font-display " + (delta <= 0 ? "text-electric" : "text-amber-400")}>{delta > 0 ? "+" : ""}{delta} lb</span>
          </div>
          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-auto"><polyline points={chart.pts} fill="none" stroke="#3d8cff" strokeWidth="2" /></svg>
          <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-1">{rows[0].date} → {rows[rows.length - 1].date}</p>
        </div>
      )}
      {rows.length > 0 && (
        <div className={card + " max-h-56 overflow-y-auto"}>
          {[...rows].reverse().map((r) => (
            <div key={r.date} className="flex justify-between border-b border-bone/5 py-1.5 text-sm">
              <span className="text-bone/60">{r.date}</span>
              <span className="font-display text-bone">{r.weight} lb{r.waist ? ` · ${r.waist}" waist` : ""}</span>
            </div>
          ))}
        </div>
      )}
      {rows.length === 0 && <p className="text-bone/50 text-sm">Log your weight to start a trend chart.</p>}
    </div>
  );
}

/* ---------- Habit / streak tracker ---------- */
function Habits() {
  const HK = "ts-habits", LK = "ts-habit-log";
  const [habits, saveH] = useCloudState<string[]>(HK, ["Hit protein goal", "10k steps", "8h sleep", "Water"]);
  const [log, saveL] = useCloudState<Record<string, string[]>>(LK, {});
  const [name, setName] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const toggle = (h: string) => {
    const day = log[today] || [];
    const next = { ...log, [today]: day.includes(h) ? day.filter((x) => x !== h) : [...day, h] };
    saveL(next);
  };
  const streak = (h: string) => {
    let s = 0; const d = new Date();
    for (;;) { const key = d.toISOString().slice(0, 10); if ((log[key] || []).includes(h)) { s++; d.setDate(d.getDate() - 1); } else break; }
    return s;
  };
  return (
    <div className="grid gap-4 max-w-lg">
      <div className="flex gap-2">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a habit…" />
        <button className={ghost} onClick={() => { if (name.trim()) { saveH([...habits, name.trim()]); setName(""); } }}>Add</button>
      </div>
      <div className="grid gap-2">
        {habits.map((h) => {
          const done = (log[today] || []).includes(h); const s = streak(h);
          return (
            <button key={h} onClick={() => toggle(h)} className={"flex items-center justify-between p-3 border transition-colors text-left " + (done ? "border-electric bg-electric/10" : "border-bone/15 hover:border-electric/50")}>
              <span className="flex items-center gap-3">
                <span className={"h-5 w-5 border flex items-center justify-center text-xs " + (done ? "bg-electric text-ink border-electric" : "border-bone/40")}>{done ? "✓" : ""}</span>
                <span className="font-display uppercase tracking-wider text-sm text-bone">{h}</span>
              </span>
              <span className="text-xs font-display text-electric">{s > 0 ? `🔥 ${s}d` : ""}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] uppercase tracking-wider text-bone/40">Tap to mark done today · streak counts consecutive days</p>
    </div>
  );
}

/* ---------- Plate calc + unit converter ---------- */
function Plate() {
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [target, setTarget] = useState("225"), [bar, setBar] = useState("45");
  const plates = unit === "lb" ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
  const res = useMemo(() => {
    const t = parseFloat(target) || 0, b = parseFloat(bar) || 0; let per = (t - b) / 2;
    if (per <= 0) return { per: 0, list: [] as any[], left: 0 };
    const list: any[] = []; let rem = per;
    for (const p of plates) { const c = Math.floor(rem / p); if (c > 0) { list.push({ p, c }); rem = +(rem - c * p).toFixed(3); } }
    return { per, list, left: rem };
  }, [target, bar, unit]);
  const conv = unit === "lb" ? `${(parseFloat(target) * 0.453592 || 0).toFixed(1)} kg` : `${(parseFloat(target) * 2.20462 || 0).toFixed(1)} lb`;
  return (
    <div className="grid gap-5 max-w-md">
      <div className="flex gap-2">{(["lb", "kg"] as const).map((u) => (<button key={u} onClick={() => { setUnit(u); setBar(u === "lb" ? "45" : "20"); }} className={u === unit ? btn : ghost}>{u}</button>))}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={label}>Target total ({unit})</label><input className={input} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
        <div><label className={label}>Bar ({unit})</label><input className={input} inputMode="decimal" value={bar} onChange={(e) => setBar(e.target.value)} /></div>
      </div>
      <div className={card}>
        {res.per <= 0 ? <p className="text-bone/50 text-sm">Target must be heavier than the bar.</p> : (
          <>
            <p className="text-[11px] uppercase tracking-wider text-bone/50">Load per side · <span className="text-bone/40">{conv} total</span></p>
            <p className="text-3xl font-display text-electric mb-3">{res.per} {unit}</p>
            <div className="flex flex-wrap gap-2">{res.list.map((x: any) => (<span key={x.p} className="font-display border border-electric/40 bg-electric/5 text-bone px-3 py-1.5 text-sm">{x.c} × {x.p}</span>))}</div>
            {res.left > 0 && <p className="text-[11px] text-amber-400 mt-2">{res.left} {unit}/side short with standard plates.</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default function ClientExtras() {
  const [t, setT] = useState<Tab>("records");
  const tabs: { id: Tab; label: string }[] = [
    { id: "records", label: "PR Board" },
    { id: "calendar", label: "Calendar" },
    { id: "bodyweight", label: "Bodyweight" },
    { id: "habits", label: "Habits & Streaks" },
    { id: "deload", label: "Readiness" },
    { id: "warmup", label: "Warm-up" },
    { id: "plate", label: "Plate & Convert" },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setT(x.id)} className={"px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " + (t === x.id ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-bone/20")}>{x.label}</button>
        ))}
      </div>
      {t === "records" && <Records />}
      {t === "calendar" && <Calendar />}
      {t === "bodyweight" && <Bodyweight />}
      {t === "habits" && <Habits />}
      {t === "deload" && <Deload />}
      {t === "warmup" && <Warmup />}
      {t === "plate" && <Plate />}
    </div>
  );
}
