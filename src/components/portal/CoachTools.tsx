"use client";

import { useEffect, useMemo, useState } from "react";
import { useCloudState } from "../../lib/cloud";

type Client = { id: string; username: string; email: string };
type ToolTab = "progress" | "activity" | "needs" | "volume" | "onerm" | "plate" | "macros" | "goals" | "intake" | "assign" | "templates" | "timer" | "reference" | "broadcast" | "notes";

const card = "border border-bone/15 bg-ink/20 p-5";
const label = "block text-[11px] uppercase tracking-wider text-bone/50 mb-1 font-display";
const input =
  "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";
const btn =
  "font-display uppercase tracking-wider text-sm bg-electric text-ink px-5 py-2.5 hover:bg-bone transition-colors disabled:opacity-50";
const ghost =
  "font-display uppercase tracking-wider text-xs border border-bone/25 text-bone/70 px-4 py-2 hover:border-electric hover:text-electric transition-colors";

const est1RM = (w: number, r: number) =>
  w > 0 && r > 0 ? Math.round(w * (1 + r / 30)) : 0;

/* -------------------- Progress Dashboard -------------------- */
function ProgressDashboard({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState("");
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) { setWorkouts([]); return; }
    setLoading(true);
    fetch(`/api/trainer/client-tracker?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => (r.ok ? r.json() : { workouts: [] }))
      .then((d) => setWorkouts(Array.isArray(d.workouts) ? d.workouts : []))
      .catch(() => setWorkouts([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  // Build est-1RM series per exercise across dated workouts.
  const series = useMemo(() => {
    const byExercise: Record<string, { date: string; e1rm: number }[]> = {};
    const sorted = [...workouts].sort(
      (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
    );
    for (const w of sorted) {
      for (const ex of w.exercises || []) {
        const best = (ex.sets || []).reduce(
          (m: number, s: any) => Math.max(m, est1RM(parseFloat(s.weight), parseFloat(s.reps))),
          0
        );
        if (best > 0) {
          (byExercise[ex.name] = byExercise[ex.name] || []).push({ date: w.date, e1rm: best });
        }
      }
    }
    return Object.entries(byExercise)
      .map(([name, pts]) => ({ name, pts }))
      .filter((e) => e.pts.length >= 2)
      .sort((a, b) => b.pts.length - a.pts.length)
      .slice(0, 6);
  }, [workouts]);

  return (
    <div className="grid gap-5">
      <div>
        <label className={label}>Client</label>
        <select className={input} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.username}</option>
          ))}
        </select>
      </div>

      {!clientId ? (
        <p className="text-bone/50 text-sm">Pick a client to see their strength trends.</p>
      ) : loading ? (
        <p className="text-bone/50 font-display uppercase tracking-wider text-sm">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className={card}>
              <p className="text-3xl font-display text-electric">{workouts.length}</p>
              <p className="text-[11px] uppercase tracking-wider text-bone/50">Sessions logged</p>
            </div>
            <div className={card}>
              <p className="text-3xl font-display text-electric">{series.length}</p>
              <p className="text-[11px] uppercase tracking-wider text-bone/50">Lifts trending</p>
            </div>
            <div className={card}>
              <p className="text-lg font-display text-bone mt-1">
                {workouts.length
                  ? new Date([...workouts].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0].date).toLocaleDateString()
                  : "—"}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-bone/50">Last session</p>
            </div>
          </div>

          {series.length === 0 ? (
            <p className="text-bone/50 text-sm">
              Not enough logged data yet — a lift needs at least 2 sessions with weight &amp; reps to chart.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {series.map((s) => {
                const vals = s.pts.map((p) => p.e1rm);
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const range = max - min || 1;
                const W = 260, H = 80, pad = 6;
                const pts = s.pts
                  .map((p, i) => {
                    const x = pad + (i * (W - pad * 2)) / (s.pts.length - 1);
                    const y = H - pad - ((p.e1rm - min) / range) * (H - pad * 2);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ");
                const first = vals[0];
                const last = vals[vals.length - 1];
                const delta = last - first;
                return (
                  <div key={s.name} className={card}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-display uppercase tracking-wider text-bone text-sm truncate">{s.name}</p>
                      <span className={"text-xs font-display " + (delta >= 0 ? "text-electric" : "text-red-400")}>
                        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} lb
                      </span>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
                      <polyline points={pts} fill="none" stroke="#3d8cff" strokeWidth="2" />
                      {s.pts.map((p, i) => {
                        const x = pad + (i * (W - pad * 2)) / (s.pts.length - 1);
                        const y = H - pad - ((p.e1rm - min) / range) * (H - pad * 2);
                        return <circle key={i} cx={x} cy={y} r="2.5" fill="#3d8cff" />;
                      })}
                    </svg>
                    <p className="text-[11px] uppercase tracking-wider text-bone/50 mt-1">
                      Est. 1RM · {first} → {last} lb over {s.pts.length} sessions
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------- 1RM & % Calculator -------------------- */
function OneRMTool() {
  const [weight, setWeight] = useState("225");
  const [reps, setReps] = useState("5");
  const oneRm = est1RM(parseFloat(weight), parseFloat(reps));
  const rows = [95, 90, 85, 80, 75, 70, 65, 60];
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div>
          <label className={label}>Weight lifted (lb)</label>
          <input className={input} value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" />
        </div>
        <div>
          <label className={label}>Reps</label>
          <input className={input} value={reps} onChange={(e) => setReps(e.target.value)} inputMode="numeric" />
        </div>
      </div>
      <div className={card + " max-w-sm"}>
        <p className="text-[11px] uppercase tracking-wider text-bone/50">Estimated 1-Rep Max</p>
        <p className="text-4xl font-display text-electric">{oneRm || "—"} <span className="text-lg text-bone/60">lb</span></p>
        <p className="text-[11px] text-bone/40 mt-1">Epley formula</p>
      </div>
      {oneRm > 0 && (
        <div className={card + " max-w-md"}>
          <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-3">Percentage of 1RM</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {rows.map((pct) => (
              <div key={pct} className="flex items-center justify-between border-b border-bone/5 py-1">
                <span className="text-bone/60 text-sm">{pct}%</span>
                <span className="font-display text-bone">{Math.round((oneRm * pct) / 100)} lb</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Plate Calculator -------------------- */
function PlateTool() {
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [target, setTarget] = useState("225");
  const [bar, setBar] = useState("45");
  const plates = unit === "lb" ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];

  const result = useMemo(() => {
    const t = parseFloat(target) || 0;
    const b = parseFloat(bar) || 0;
    let perSide = (t - b) / 2;
    if (perSide <= 0) return { perSide: 0, list: [] as { plate: number; count: number }[], leftover: 0 };
    const list: { plate: number; count: number }[] = [];
    let remaining = perSide;
    for (const p of plates) {
      const count = Math.floor(remaining / p);
      if (count > 0) { list.push({ plate: p, count }); remaining = +(remaining - count * p).toFixed(3); }
    }
    return { perSide, list, leftover: remaining };
  }, [target, bar, unit]);

  return (
    <div className="grid gap-5 max-w-md">
      <div className="flex gap-2">
        {(["lb", "kg"] as const).map((u) => (
          <button key={u} onClick={() => { setUnit(u); setBar(u === "lb" ? "45" : "20"); }}
            className={u === unit ? btn : ghost}>{u}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Target total ({unit})</label>
          <input className={input} value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" />
        </div>
        <div>
          <label className={label}>Bar weight ({unit})</label>
          <input className={input} value={bar} onChange={(e) => setBar(e.target.value)} inputMode="decimal" />
        </div>
      </div>
      <div className={card}>
        {result.perSide <= 0 ? (
          <p className="text-bone/50 text-sm">Target must be heavier than the bar.</p>
        ) : (
          <>
            <p className="text-[11px] uppercase tracking-wider text-bone/50">Load per side</p>
            <p className="text-3xl font-display text-electric mb-3">{result.perSide} {unit}</p>
            <div className="flex flex-wrap gap-2">
              {result.list.map((p) => (
                <span key={p.plate} className="font-display border border-electric/40 bg-electric/5 text-bone px-3 py-1.5 text-sm">
                  {p.count} × {p.plate}
                </span>
              ))}
            </div>
            {result.leftover > 0 && (
              <p className="text-[11px] text-red-400 mt-2">Can&apos;t make exact — {result.leftover} {unit}/side short with standard plates.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------- Macro / TDEE for a client -------------------- */
function MacroTool({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState("");
  const [sex, setSex] = useState("male");
  const [age, setAge] = useState("30");
  const [weightLb, setWeightLb] = useState("180");
  const [heightIn, setHeightIn] = useState("70");
  const [activity, setActivity] = useState("1.55");
  const [goalType, setGoalType] = useState("maintain");
  const [pushing, setPushing] = useState(false);
  const [flash, setFlash] = useState("");

  const macros = useMemo(() => {
    const kg = (parseFloat(weightLb) || 0) * 0.453592;
    const cm = (parseFloat(heightIn) || 0) * 2.54;
    const a = parseFloat(age) || 0;
    if (!kg || !cm || !a) return null;
    let bmr = 10 * kg + 6.25 * cm - 5 * a + (sex === "male" ? 5 : -161);
    let tdee = bmr * (parseFloat(activity) || 1.2);
    const adj: Record<string, number> = { cut: -0.2, maintain: 0, leangain: 0.1, bulk: 0.15 };
    const calories = Math.round(tdee * (1 + (adj[goalType] ?? 0)));
    const protein = Math.round(parseFloat(weightLb) || 0); // ~1 g/lb
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
    return { calories, protein, carbs, fat };
  }, [sex, age, weightLb, heightIn, activity, goalType]);

  async function push() {
    if (!clientId || !macros) return;
    setPushing(true); setFlash("");
    const res = await fetch("/api/trainer/push-macros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, goal: macros }),
    });
    setPushing(false);
    setFlash(res.ok ? "✓ Targets pushed — the client sees them in their Nutrition Tracker." : "Something went wrong.");
    if (res.ok) setTimeout(() => setFlash(""), 4000);
  }

  return (
    <div className="grid gap-5 max-w-xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className={label}>Sex</label>
          <select className={input} value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div><label className={label}>Age</label><input className={input} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" /></div>
        <div><label className={label}>Weight (lb)</label><input className={input} value={weightLb} onChange={(e) => setWeightLb(e.target.value)} inputMode="decimal" /></div>
        <div><label className={label}>Height (in)</label><input className={input} value={heightIn} onChange={(e) => setHeightIn(e.target.value)} inputMode="decimal" /></div>
        <div>
          <label className={label}>Activity</label>
          <select className={input} value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value="1.2">Sedentary</option>
            <option value="1.375">Light</option>
            <option value="1.55">Moderate</option>
            <option value="1.725">Very active</option>
            <option value="1.9">Athlete</option>
          </select>
        </div>
        <div>
          <label className={label}>Goal</label>
          <select className={input} value={goalType} onChange={(e) => setGoalType(e.target.value)}>
            <option value="cut">Fat loss (−20%)</option>
            <option value="maintain">Maintain</option>
            <option value="leangain">Lean gain (+10%)</option>
            <option value="bulk">Bulk (+15%)</option>
          </select>
        </div>
      </div>

      {macros && (
        <div className={card}>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[["Calories", macros.calories, "kcal"], ["Protein", macros.protein, "g"], ["Carbs", macros.carbs, "g"], ["Fat", macros.fat, "g"]].map(([k, v, u]) => (
              <div key={k as string}>
                <p className="text-2xl font-display text-electric">{v as number}</p>
                <p className="text-[10px] uppercase tracking-wider text-bone/50">{k as string} <span className="text-bone/30">{u as string}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-bone/10 pt-4">
        <label className={label}>Push to client</label>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select className={input + " sm:max-w-xs"} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select a client…</option>
            {clients.map((c) => (<option key={c.id} value={c.id}>{c.username}</option>))}
          </select>
          <button className={btn} onClick={push} disabled={!clientId || !macros || pushing}>
            {pushing ? "Pushing…" : "Push targets →"}
          </button>
        </div>
        {flash && <p className="mt-2 text-electric font-display uppercase tracking-wider text-xs">{flash}</p>}
      </div>
    </div>
  );
}

/* -------------------- Broadcast -------------------- */
function BroadcastTool({ clients }: { clients: Client[] }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState("");

  async function send() {
    if (!text.trim()) return;
    setSending(true); setFlash("");
    const res = await fetch("/api/trainer/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() }),
    });
    setSending(false);
    if (res.ok) {
      const d = await res.json();
      setFlash(`✓ Sent to ${d.sent} client${d.sent === 1 ? "" : "s"}.`);
      setText("");
      setTimeout(() => setFlash(""), 4000);
    } else setFlash("Something went wrong.");
  }

  return (
    <div className="grid gap-4 max-w-xl">
      <p className="text-bone/60 text-sm">
        Send one message to all {clients.length} of your assigned client{clients.length === 1 ? "" : "s"}. It lands in each client&apos;s message thread with you.
      </p>
      <textarea
        className={input + " resize-none"}
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Gym closed Monday for the holiday — I've moved everyone's session to Tuesday."
        maxLength={4000}
      />
      <div className="flex items-center gap-4">
        <button className={btn} onClick={send} disabled={!text.trim() || sending || clients.length === 0}>
          {sending ? "Sending…" : "Send to all clients"}
        </button>
        {flash && <span className="text-electric font-display uppercase tracking-wider text-xs">{flash}</span>}
      </div>
    </div>
  );
}

/* -------------------- Client Notes -------------------- */
function NotesTool({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!clientId) { setNotes(""); return; }
    setLoading(true);
    fetch(`/api/trainer/client-notes?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => (r.ok ? r.json() : { notes: "" }))
      .then((d) => setNotes(d.notes || ""))
      .catch(() => setNotes(""))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function save() {
    if (!clientId) return;
    setSaving(true); setFlash("");
    const res = await fetch("/api/trainer/client-notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, notes }),
    });
    setSaving(false);
    setFlash(res.ok ? "✓ Saved" : "Something went wrong.");
    if (res.ok) setTimeout(() => setFlash(""), 3000);
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      <div>
        <label className={label}>Client</label>
        <select className={input + " sm:max-w-xs"} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Select a client…</option>
          {clients.map((c) => (<option key={c.id} value={c.id}>{c.username}</option>))}
        </select>
      </div>
      {clientId && (
        <>
          <p className="text-bone/50 text-[11px] uppercase tracking-wider">Private to you &amp; admins · the client never sees these</p>
          <textarea
            className={input + " resize-none"}
            rows={10}
            value={notes}
            disabled={loading}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Injuries, movement screen, goals, preferences, program history…"
            maxLength={8000}
          />
          <div className="flex items-center gap-4">
            <button className={btn} onClick={save} disabled={saving || loading}>
              {saving ? "Saving…" : "Save notes"}
            </button>
            {flash && <span className="text-electric font-display uppercase tracking-wider text-xs">{flash}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------- Activity Board (T1) -------------------- */
function ActivityBoard() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trainer/activity")
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d) => setRows(d.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const daysSince = (v: string | null) => {
    if (!v) return null;
    return Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  };
  const flag = (days: number | null, amber: number, red: number) => {
    if (days === null) return "text-red-400";
    if (days >= red) return "text-red-400";
    if (days >= amber) return "text-amber-400";
    return "text-electric";
  };
  const fmt = (days: number | null) => (days === null ? "never" : days === 0 ? "today" : `${days}d ago`);

  if (loading) return <p className="text-bone/50 font-display uppercase tracking-wider text-sm">Loading…</p>;
  if (!rows.length) return <p className="text-bone/50 text-sm">No clients assigned yet.</p>;

  return (
    <div className={card + " overflow-x-auto"}>
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15">
            <th className="text-left py-2">Client</th>
            <th className="text-center py-2">Workouts</th>
            <th className="text-center py-2">Last workout</th>
            <th className="text-center py-2">Last nutrition</th>
            <th className="text-center py-2">Last check-in</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const w = daysSince(r.lastWorkout), n = daysSince(r.lastNutrition), c = daysSince(r.lastCheckin);
            return (
              <tr key={r.id} className="border-b border-bone/5">
                <td className="py-3 font-display uppercase tracking-wider text-bone">{r.username}</td>
                <td className="text-center text-bone/70">{r.workoutCount}</td>
                <td className={"text-center font-display " + flag(w, 5, 10)}>{fmt(w)}</td>
                <td className={"text-center font-display " + flag(n, 3, 7)}>{fmt(n)}</td>
                <td className={"text-center font-display " + flag(c, 8, 14)}>{fmt(c)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-3">
        <span className="text-electric">●</span> on track · <span className="text-amber-400">●</span> slipping · <span className="text-red-400">●</span> overdue
      </p>
    </div>
  );
}

/* -------------------- Goals & Milestones (T4) -------------------- */
function GoalsTool({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState("");
  const [goals, setGoals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!clientId) { setGoals([]); return; }
    fetch(`/api/trainer/client-goals?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => (r.ok ? r.json() : { goals: [] }))
      .then((d) => setGoals(d.goals || []))
      .catch(() => {});
  }, [clientId]);

  const add = () => setGoals((g) => [...g, { id: Math.random().toString(36).slice(2), label: "", target: 0, current: 0, unit: "lb" }]);
  const upd = (i: number, k: string, v: any) => setGoals((g) => g.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const del = (i: number) => setGoals((g) => g.filter((_, j) => j !== i));

  async function save() {
    if (!clientId) return;
    setSaving(true); setFlash("");
    const res = await fetch("/api/trainer/client-goals", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, goals }),
    });
    setSaving(false); setFlash(res.ok ? "✓ Saved" : "Error");
    if (res.ok) setTimeout(() => setFlash(""), 2500);
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      <div>
        <label className={label}>Client</label>
        <select className={input + " sm:max-w-xs"} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Select a client…</option>
          {clients.map((c) => (<option key={c.id} value={c.id}>{c.username}</option>))}
        </select>
      </div>
      {clientId && (
        <>
          <div className="grid gap-3">
            {goals.map((g, i) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
              return (
                <div key={g.id} className={card}>
                  <div className="flex items-center gap-2 mb-2">
                    <input className={input} placeholder="Goal (e.g. Squat 1RM)" value={g.label} onChange={(e) => upd(i, "label", e.target.value)} />
                    <button onClick={() => del(i)} className="text-bone/40 hover:text-electric shrink-0 px-2">✕</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div><label className={label}>Current</label><input className={input} inputMode="decimal" value={g.current} onChange={(e) => upd(i, "current", parseFloat(e.target.value) || 0)} /></div>
                    <div><label className={label}>Target</label><input className={input} inputMode="decimal" value={g.target} onChange={(e) => upd(i, "target", parseFloat(e.target.value) || 0)} /></div>
                    <div><label className={label}>Unit</label><input className={input} value={g.unit} onChange={(e) => upd(i, "unit", e.target.value)} /></div>
                  </div>
                  <div className="h-2 bg-ink/60 border border-bone/10 overflow-hidden">
                    <div className="h-full bg-electric" style={{ width: pct + "%" }} />
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-bone/50 mt-1">{pct}% · {g.current}/{g.target} {g.unit}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={add} className={ghost}>+ Add goal</button>
            <button onClick={save} className={btn} disabled={saving}>{saving ? "Saving…" : "Save goals"}</button>
            {flash && <span className="text-electric font-display uppercase tracking-wider text-xs">{flash}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------- Rest / Interval Timer (T3) -------------------- */
function TimerTool() {
  const [mode, setMode] = useState<"rest" | "interval">("rest");
  const [rest, setRest] = useState(90);
  const [work, setWork] = useState(30);
  const [brk, setBrk] = useState(15);
  const [rounds, setRounds] = useState(8);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(90);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [round, setRound] = useState(1);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((s) => {
        if (s > 1) return s - 1;
        try { new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play(); } catch {}
        if (mode === "rest") { setRunning(false); return 0; }
        // interval mode: toggle phase / advance rounds
        setPhase((p) => {
          if (p === "work") return "break";
          setRound((r) => { if (r >= rounds) { setRunning(false); return r; } return r + 1; });
          return "work";
        });
        return phase === "work" ? brk : work;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, phase, work, brk, rounds]);

  const start = () => {
    if (mode === "rest") setRemaining(rest);
    else { setRemaining(work); setPhase("work"); setRound(1); }
    setRunning(true);
  };
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="grid gap-5 max-w-md">
      <div className="flex gap-2">
        {(["rest", "interval"] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setRunning(false); }} className={m === mode ? btn : ghost}>{m}</button>
        ))}
      </div>
      {mode === "rest" ? (
        <div><label className={label}>Rest (seconds)</label><input className={input} inputMode="numeric" value={rest} onChange={(e) => setRest(parseInt(e.target.value) || 0)} /></div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div><label className={label}>Work (s)</label><input className={input} inputMode="numeric" value={work} onChange={(e) => setWork(parseInt(e.target.value) || 0)} /></div>
          <div><label className={label}>Break (s)</label><input className={input} inputMode="numeric" value={brk} onChange={(e) => setBrk(parseInt(e.target.value) || 0)} /></div>
          <div><label className={label}>Rounds</label><input className={input} inputMode="numeric" value={rounds} onChange={(e) => setRounds(parseInt(e.target.value) || 1)} /></div>
        </div>
      )}
      <div className={card + " text-center"}>
        <p className="text-6xl font-display text-electric">{mmss(remaining)}</p>
        {mode === "interval" && running && (
          <p className="text-[11px] uppercase tracking-wider text-bone/60 mt-1">{phase} · round {round}/{rounds}</p>
        )}
      </div>
      <div className="flex gap-2">
        {!running ? <button className={btn} onClick={start}>Start</button> : <button className={btn} onClick={() => setRunning(false)}>Pause</button>}
        <button className={ghost} onClick={() => { setRunning(false); setRemaining(mode === "rest" ? rest : work); setRound(1); setPhase("work"); }}>Reset</button>
      </div>
    </div>
  );
}

/* -------------------- RPE / RIR & Tempo reference (T5) -------------------- */
function ReferenceTool() {
  const rpe = [
    ["10", "0", "Max effort — no reps left"],
    ["9.5", "0–1", "Maybe 1 more rep"],
    ["9", "1", "1 rep in reserve"],
    ["8", "2", "2 reps in reserve"],
    ["7", "3", "3 reps in reserve — speed work"],
    ["6", "4+", "Light / technique"],
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
      <div className={card}>
        <p className="font-display uppercase tracking-wider text-electric text-sm mb-3">RPE → RIR</p>
        <div className="grid gap-1.5">
          {rpe.map((r) => (
            <div key={r[0]} className="grid grid-cols-[40px_48px_1fr] gap-2 items-center border-b border-bone/5 py-1.5">
              <span className="font-display text-bone">{r[0]}</span>
              <span className="text-electric text-sm">{r[1]} RIR</span>
              <span className="text-bone/60 text-xs">{r[2]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={card}>
        <p className="font-display uppercase tracking-wider text-electric text-sm mb-3">Tempo (4 digits)</p>
        <p className="text-bone/70 text-sm leading-relaxed">
          <span className="text-bone font-display">Eccentric · Bottom pause · Concentric · Top pause</span> (seconds).
        </p>
        <ul className="mt-3 grid gap-2 text-sm">
          <li className="border-b border-bone/5 py-1.5"><span className="font-display text-electric">3010</span> <span className="text-bone/60">— 3s down, no pause, explode up, no pause (hypertrophy)</span></li>
          <li className="border-b border-bone/5 py-1.5"><span className="font-display text-electric">31X0</span> <span className="text-bone/60">— 3s down, 1s pause, X = explosive up (strength)</span></li>
          <li className="border-b border-bone/5 py-1.5"><span className="font-display text-electric">2020</span> <span className="text-bone/60">— controlled both ways (technique)</span></li>
          <li className="py-1.5"><span className="font-display text-electric">5050</span> <span className="text-bone/60">— slow eccentric &amp; concentric (time under tension)</span></li>
        </ul>
      </div>
    </div>
  );
}

/* -------------------- Needs Attention digest -------------------- */
function NeedsAttention() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/trainer/activity").then((r) => (r.ok ? r.json() : { clients: [] })).then((d) => setRows(d.clients || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const since = (v: string | null) => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86400000) : null);
  const flags = rows.map((r) => {
    const list: string[] = [];
    const w = since(r.lastWorkout), c = since(r.lastCheckin), n = since(r.lastNutrition);
    if (w === null || w >= 7) list.push(w === null ? "never logged a workout" : `no workout in ${w}d`);
    if (c === null || c >= 10) list.push(c === null ? "never checked in" : `no check-in in ${c}d`);
    if (n !== null && n >= 5) list.push(`no nutrition log in ${n}d`);
    return { ...r, list };
  }).filter((r) => r.list.length);
  if (loading) return <p className="text-bone/50 font-display uppercase tracking-wider text-sm">Loading…</p>;
  if (!flags.length) return <p className="text-electric font-display uppercase tracking-wider text-sm">✓ All clients are on track — nothing needs attention.</p>;
  return (
    <div className="grid gap-3 max-w-2xl">
      <p className="text-bone/60 text-sm">{flags.length} client{flags.length === 1 ? "" : "s"} could use a nudge:</p>
      {flags.map((r) => (
        <div key={r.id} className={card + " border-amber-400/30"}>
          <p className="font-display uppercase tracking-wider text-bone">{r.username}</p>
          <ul className="mt-1 text-sm text-amber-400/90 list-disc list-inside">
            {r.list.map((x: string, i: number) => (<li key={i}>{x}</li>))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* -------------------- Volume / Tonnage Report -------------------- */
function VolumeReport({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState("");
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!clientId) { setWorkouts([]); return; }
    setLoading(true);
    fetch(`/api/trainer/client-tracker?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => (r.ok ? r.json() : { workouts: [] })).then((d) => setWorkouts(d.workouts || [])).catch(() => {}).finally(() => setLoading(false));
  }, [clientId]);

  const weeks = useMemo(() => {
    const buckets: Record<string, { sets: number; tonnage: number }> = {};
    for (const w of workouts) {
      const d = new Date(w.date); if (isNaN(d.getTime())) continue;
      const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      const b = (buckets[key] = buckets[key] || { sets: 0, tonnage: 0 });
      for (const ex of w.exercises || []) for (const s of ex.sets || []) {
        const wt = parseFloat(s.weight), rp = parseFloat(s.reps);
        if (wt > 0 && rp > 0) { b.sets += 1; b.tonnage += wt * rp; }
      }
    }
    return Object.entries(buckets).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
  }, [workouts]);
  const maxT = Math.max(1, ...weeks.map(([, v]) => v.tonnage));

  return (
    <div className="grid gap-4 max-w-2xl">
      <div>
        <label className={label}>Client</label>
        <select className={input + " sm:max-w-xs"} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Select a client…</option>
          {clients.map((c) => (<option key={c.id} value={c.id}>{c.username}</option>))}
        </select>
      </div>
      {!clientId ? <p className="text-bone/50 text-sm">Pick a client to see weekly training volume.</p>
        : loading ? <p className="text-bone/50 font-display uppercase tracking-wider text-sm">Loading…</p>
        : weeks.length === 0 ? <p className="text-bone/50 text-sm">No logged sets with weight &amp; reps yet.</p>
        : (
          <div className={card}>
            <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-4">Weekly tonnage (weight × reps) · last 8 weeks</p>
            <div className="grid gap-2">
              {weeks.map(([wk, v]) => (
                <div key={wk} className="flex items-center gap-3">
                  <span className="text-bone/50 text-xs w-20 shrink-0">{wk.slice(5)}</span>
                  <div className="flex-1 h-4 bg-ink/60 border border-bone/10"><div className="h-full bg-electric" style={{ width: (v.tonnage / maxT) * 100 + "%" }} /></div>
                  <span className="font-display text-bone text-xs w-28 text-right">{Math.round(v.tonnage).toLocaleString()} lb · {v.sets} sets</span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

/* -------------------- Message Templates (canned replies) -------------------- */
function MessageTemplates() {
  const KEY = "ts-coach-templates";
  const [items, save] = useCloudState<string[]>(KEY, ["Great work this week — proud of the consistency. Keep it up!", "Don't forget to log your check-in before Sunday night.", "Bump the top set 5 lb next session if it moved well."]);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(-1);
  return (
    <div className="grid gap-4 max-w-xl">
      <p className="text-bone/60 text-sm">Save canned replies and copy them into any client chat with one tap.</p>
      <div className="flex gap-2">
        <input className={input} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="New template…" />
        <button className={ghost} onClick={() => { if (draft.trim()) { save([...items, draft.trim()]); setDraft(""); } }}>Add</button>
      </div>
      <div className="grid gap-2">
        {items.map((t, i) => (
          <div key={i} className={card + " flex items-start justify-between gap-3"}>
            <p className="text-bone/80 text-sm">{t}</p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => { navigator.clipboard?.writeText(t); setCopied(i); setTimeout(() => setCopied(-1), 1500); }} className="text-electric font-display uppercase text-[10px] tracking-wider">{copied === i ? "Copied!" : "Copy"}</button>
              <button onClick={() => save(items.filter((_, j) => j !== i))} className="text-bone/40 hover:text-electric">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- Intake / Onboarding Checklist -------------------- */
function IntakeChecklist({ clients }: { clients: Client[] }) {
  const DEFAULTS = ["Signed waiver / PAR-Q", "Goals & timeline set", "Injury / limitation review", "Equipment access confirmed", "Starting stats & photos", "First program assigned", "Nutrition targets set"];
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!clientId) { setItems([]); return; }
    fetch(`/api/trainer/client-intake?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items?.length ? d.items : DEFAULTS.map((label) => ({ id: Math.random().toString(36).slice(2), label, done: false }))))
      .catch(() => {});
  }, [clientId]);
  const save = async (next: any[]) => {
    setItems(next);
    const res = await fetch("/api/trainer/client-intake", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, items: next }) });
    if (res.ok) { setFlash("✓ Saved"); setTimeout(() => setFlash(""), 1500); }
  };
  const done = items.filter((i) => i.done).length;
  return (
    <div className="grid gap-4 max-w-xl">
      <div>
        <label className={label}>Client</label>
        <select className={input + " sm:max-w-xs"} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Select a client…</option>
          {clients.map((c) => (<option key={c.id} value={c.id}>{c.username}</option>))}
        </select>
      </div>
      {clientId && (
        <>
          <p className="text-electric font-display uppercase tracking-wider text-xs">{done}/{items.length} complete {flash && <span className="text-bone/50">· {flash}</span>}</p>
          <div className="grid gap-2">
            {items.map((it, i) => (
              <div key={it.id} className={card + " flex items-center gap-3"}>
                <button onClick={() => save(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} className={"h-5 w-5 border flex items-center justify-center text-xs shrink-0 " + (it.done ? "bg-electric text-ink border-electric" : "border-bone/40")}>{it.done ? "✓" : ""}</button>
                <input className="flex-1 bg-transparent text-bone outline-none text-sm" value={it.label} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} onBlur={() => save(items)} />
                <button onClick={() => save(items.filter((_, j) => j !== i))} className="text-bone/40 hover:text-electric shrink-0">✕</button>
              </div>
            ))}
          </div>
          <button className={ghost} onClick={() => save([...items, { id: Math.random().toString(36).slice(2), label: "New step", done: false }])}>+ Add step</button>
        </>
      )}
    </div>
  );
}

/* -------------------- Assign a template to many clients -------------------- */
function AssignToMany({ clients }: { clients: Client[] }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/trainer/templates").then((r) => (r.ok ? r.json() : { templates: [] })).then((d) => setTemplates(d.templates || [])).catch(() => {});
  }, []);
  const chosen = templates.find((t) => t.id === templateId);
  const ids = Object.keys(sel).filter((k) => sel[k]);
  async function run() {
    if (!chosen || !ids.length) return;
    setBusy(true); setFlash("");
    let ok = 0;
    for (const clientId of ids) {
      const res = await fetch("/api/trainer/assign-template", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, template: chosen }) });
      if (res.ok) ok++;
    }
    setBusy(false); setSel({}); setFlash(`✓ Sent to ${ok} client${ok === 1 ? "" : "s"}`); setTimeout(() => setFlash(""), 4000);
  }
  return (
    <div className="grid gap-4 max-w-xl">
      {templates.length === 0 ? (
        <p className="text-bone/60 text-sm">Save a workout template first (in the Trainer &gt; Programs / template builder), then you can push it to several clients here.</p>
      ) : (
        <>
          <div>
            <label className={label}>Template to send</label>
            <select className={input + " sm:max-w-md"} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select a template…</option>
              {templates.map((t) => (<option key={t.id} value={t.id}>{t.name} ({t.exercises?.length || 0} exercises)</option>))}
            </select>
          </div>
          <div>
            <label className={label}>Send to</label>
            <div className={card + " grid gap-1.5 max-h-72 overflow-y-auto"}>
              {clients.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-bone/80 cursor-pointer py-1">
                  <input type="checkbox" checked={!!sel[c.id]} onChange={(e) => setSel((s) => ({ ...s, [c.id]: e.target.checked }))} />
                  <span className="font-display uppercase tracking-wider">{c.username}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className={btn} onClick={run} disabled={!templateId || !ids.length || busy}>{busy ? "Sending…" : `Push to ${ids.length} selected`}</button>
            {flash && <span className="text-electric font-display uppercase tracking-wider text-xs">{flash}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------- Container -------------------- */
export default function CoachTools() {
  const [clients, setClients] = useState<Client[]>([]);
  const [tool, setTool] = useState<ToolTab>("progress");

  useEffect(() => {
    fetch("/api/trainer/clients")
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d) => setClients(d.clients || []))
      .catch(() => {});
  }, []);

  const tools: { id: ToolTab; label: string }[] = [
    { id: "progress", label: "Progress Dashboard" },
    { id: "activity", label: "Activity Board" },
    { id: "needs", label: "Needs Attention" },
    { id: "volume", label: "Volume Report" },
    { id: "goals", label: "Goals" },
    { id: "intake", label: "Intake Checklist" },
    { id: "assign", label: "Assign to Many" },
    { id: "onerm", label: "1RM & %" },
    { id: "plate", label: "Plate Calc" },
    { id: "macros", label: "Macro / TDEE" },
    { id: "templates", label: "Message Templates" },
    { id: "timer", label: "Timer" },
    { id: "reference", label: "RPE & Tempo" },
    { id: "broadcast", label: "Broadcast" },
    { id: "notes", label: "Client Notes" },
  ];

  return (
    <div>
      <div className="mb-6 border-l-2 border-electric/50 pl-4">
        <p className="font-display uppercase tracking-wider text-electric text-sm">Coach tools</p>
        <p className="text-bone/60 text-sm mt-1 leading-relaxed max-w-2xl">
          Everything you need to program, prescribe and keep clients on track.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={
              "px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
              (tool === t.id
                ? "bg-electric text-ink"
                : "text-bone/60 hover:text-electric border border-bone/20")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tool === "progress" && <ProgressDashboard clients={clients} />}
      {tool === "activity" && <ActivityBoard />}
      {tool === "needs" && <NeedsAttention />}
      {tool === "volume" && <VolumeReport clients={clients} />}
      {tool === "goals" && <GoalsTool clients={clients} />}
      {tool === "intake" && <IntakeChecklist clients={clients} />}
      {tool === "assign" && <AssignToMany clients={clients} />}
      {tool === "onerm" && <OneRMTool />}
      {tool === "plate" && <PlateTool />}
      {tool === "macros" && <MacroTool clients={clients} />}
      {tool === "templates" && <MessageTemplates />}
      {tool === "timer" && <TimerTool />}
      {tool === "reference" && <ReferenceTool />}
      {tool === "broadcast" && <BroadcastTool clients={clients} />}
      {tool === "notes" && <NotesTool clients={clients} />}
    </div>
  );
}
