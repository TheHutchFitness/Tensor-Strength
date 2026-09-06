"use client";

import { useEffect, useMemo, useState } from "react";

type Client = { id: string; username: string; email: string };
type ToolTab = "progress" | "onerm" | "plate" | "macros" | "broadcast" | "notes";

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
                      <polyline points={pts} fill="none" stroke="#00A8FF" strokeWidth="2" />
                      {s.pts.map((p, i) => {
                        const x = pad + (i * (W - pad * 2)) / (s.pts.length - 1);
                        const y = H - pad - ((p.e1rm - min) / range) * (H - pad * 2);
                        return <circle key={i} cx={x} cy={y} r="2.5" fill="#00A8FF" />;
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
    { id: "onerm", label: "1RM & %" },
    { id: "plate", label: "Plate Calc" },
    { id: "macros", label: "Macro / TDEE" },
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
      {tool === "onerm" && <OneRMTool />}
      {tool === "plate" && <PlateTool />}
      {tool === "macros" && <MacroTool clients={clients} />}
      {tool === "broadcast" && <BroadcastTool clients={clients} />}
      {tool === "notes" && <NotesTool clients={clients} />}
    </div>
  );
}
