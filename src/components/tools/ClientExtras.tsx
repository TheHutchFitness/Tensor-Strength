"use client";

import { useEffect, useMemo, useState } from "react";

type Tab = "bodyweight" | "habits" | "timer" | "plate";
const card = "border border-bone/15 bg-ink/20 p-5";
const label = "block text-[11px] uppercase tracking-wider text-bone/50 mb-1 font-display";
const input = "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none min-w-0";
const btn = "font-display uppercase tracking-wider text-sm bg-electric text-ink px-5 py-2.5 hover:bg-bone transition-colors disabled:opacity-50";
const ghost = "font-display uppercase tracking-wider text-xs border border-bone/25 text-bone/70 px-4 py-2 hover:border-electric hover:text-electric transition-colors";

/* ---------- Bodyweight & measurements ---------- */
function Bodyweight() {
  const KEY = "ts-bodyweight";
  const [rows, setRows] = useState<{ date: string; weight: number; waist?: number }[]>([]);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");

  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setRows(JSON.parse(s)); } catch {} }, []);
  const save = (next: any[]) => { setRows(next); localStorage.setItem(KEY, JSON.stringify(next)); };
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
          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-auto"><polyline points={chart.pts} fill="none" stroke="#00A8FF" strokeWidth="2" /></svg>
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
  const [habits, setHabits] = useState<string[]>([]);
  const [log, setLog] = useState<Record<string, string[]>>({});
  const [name, setName] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HK); if (h) setHabits(JSON.parse(h)); else setHabits(["Hit protein goal", "10k steps", "8h sleep", "Water"]);
      const l = localStorage.getItem(LK); if (l) setLog(JSON.parse(l));
    } catch {}
  }, []);
  const saveH = (n: string[]) => { setHabits(n); localStorage.setItem(HK, JSON.stringify(n)); };
  const saveL = (n: Record<string, string[]>) => { setLog(n); localStorage.setItem(LK, JSON.stringify(n)); };
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

/* ---------- Rest / interval timer ---------- */
function Timer() {
  const [mode, setMode] = useState<"rest" | "interval">("rest");
  const [rest, setRest] = useState(90);
  const [work, setWork] = useState(30), [brk, setBrk] = useState(15), [rounds, setRounds] = useState(8);
  const [running, setRunning] = useState(false), [remaining, setRemaining] = useState(90);
  const [phase, setPhase] = useState<"work" | "break">("work"), [round, setRound] = useState(1);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((s) => {
        if (s > 1) return s - 1;
        if (mode === "rest") { setRunning(false); return 0; }
        setPhase((p) => { if (p === "work") return "break"; setRound((r) => { if (r >= rounds) { setRunning(false); return r; } return r + 1; }); return "work"; });
        return phase === "work" ? brk : work;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, phase, work, brk, rounds]);
  const start = () => { if (mode === "rest") setRemaining(rest); else { setRemaining(work); setPhase("work"); setRound(1); } setRunning(true); };
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <div className="grid gap-5 max-w-md">
      <div className="flex gap-2">{(["rest", "interval"] as const).map((m) => (<button key={m} onClick={() => { setMode(m); setRunning(false); }} className={m === mode ? btn : ghost}>{m}</button>))}</div>
      {mode === "rest" ? (
        <div><label className={label}>Rest (seconds)</label><input className={input} inputMode="numeric" value={rest} onChange={(e) => setRest(parseInt(e.target.value) || 0)} /></div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div><label className={label}>Work (s)</label><input className={input} inputMode="numeric" value={work} onChange={(e) => setWork(parseInt(e.target.value) || 0)} /></div>
          <div><label className={label}>Break (s)</label><input className={input} inputMode="numeric" value={brk} onChange={(e) => setBrk(parseInt(e.target.value) || 0)} /></div>
          <div><label className={label}>Rounds</label><input className={input} inputMode="numeric" value={rounds} onChange={(e) => setRounds(parseInt(e.target.value) || 1)} /></div>
        </div>
      )}
      <div className={card + " text-center"}><p className="text-6xl font-display text-electric">{mmss(remaining)}</p>{mode === "interval" && running && (<p className="text-[11px] uppercase tracking-wider text-bone/60 mt-1">{phase} · round {round}/{rounds}</p>)}</div>
      <div className="flex gap-2">{!running ? <button className={btn} onClick={start}>Start</button> : <button className={btn} onClick={() => setRunning(false)}>Pause</button>}<button className={ghost} onClick={() => { setRunning(false); setRemaining(mode === "rest" ? rest : work); setRound(1); setPhase("work"); }}>Reset</button></div>
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
  const [t, setT] = useState<Tab>("bodyweight");
  const tabs: { id: Tab; label: string }[] = [
    { id: "bodyweight", label: "Bodyweight" },
    { id: "habits", label: "Habits & Streaks" },
    { id: "timer", label: "Rest Timer" },
    { id: "plate", label: "Plate & Convert" },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setT(x.id)} className={"px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " + (t === x.id ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-bone/20")}>{x.label}</button>
        ))}
      </div>
      {t === "bodyweight" && <Bodyweight />}
      {t === "habits" && <Habits />}
      {t === "timer" && <Timer />}
      {t === "plate" && <Plate />}
    </div>
  );
}
