"use client";

import { useEffect, useState } from "react";

type Client = { id: string; username: string };
type Row = { name: string; label: string; cal: string; p: string; c: string; f: string };
type Meal = { id: string; name: string; clientId: string | null; items: any[]; createdAt: string };

const emptyRow = (): Row => ({ name: "", label: "", cal: "", p: "", c: "", f: "" });

export default function TrainerMeals() {
  const [clients, setClients] = useState<Client[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [name, setName] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Macro-goal assignment (calories + protein/carbs/fat) for a specific client.
  const [mgClient, setMgClient] = useState("");
  const [mg, setMg] = useState({ calories: "", protein: "", carbs: "", fat: "" });
  const [mgSaving, setMgSaving] = useState(false);
  const [mgMsg, setMgMsg] = useState("");

  async function load() {
    const [c, m] = await Promise.all([
      fetch("/api/trainer/clients").then((r) => (r.ok ? r.json() : { clients: [] })),
      fetch("/api/trainer/meals").then((r) => (r.ok ? r.json() : { meals: [] })),
    ]);
    setClients(c.clients || []);
    setMeals(m.meals || []);
  }
  useEffect(() => { load(); }, []);

  function upd(i: number, k: keyof Row, v: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Add a meal name."); return; }
    setSaving(true); setError("");
    const items = rows.filter((r) => r.name.trim()).map((r) => ({
      name: r.name, label: r.label, cal: Number(r.cal) || 0, p: Number(r.p) || 0, c: Number(r.c) || 0, f: Number(r.f) || 0,
    }));
    const res = await fetch("/api/trainer/meals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientId: assignTo || null, items }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error || "Could not save meal.");
    else { setName(""); setAssignTo(""); setRows([emptyRow()]); await load(); }
    setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Delete this meal template?")) return;
    await fetch(`/api/trainer/meals?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function saveMacros(e: React.FormEvent) {
    e.preventDefault();
    setMgMsg("");
    if (!mgClient) { setMgMsg("Pick a client — macro goals are set per person."); return; }
    setMgSaving(true);
    const res = await fetch("/api/trainer/push-macros", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: mgClient, goal: {
        calories: Number(mg.calories) || 0, protein: Number(mg.protein) || 0,
        carbs: Number(mg.carbs) || 0, fat: Number(mg.fat) || 0,
      } }),
    });
    const d = await res.json().catch(() => ({}));
    setMgMsg(res.ok ? "Macro goals sent ✓ — loaded in their Nutrition Tracker." : (d.error || "Could not send macros."));
    setMgSaving(false);
  }

  const inputCls = "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";
  const labelCls = "text-[10px] uppercase tracking-wider text-bone/50";
  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.username || "client" : "All clients");

  return (
    <div className="grid gap-10">
      <form onSubmit={save} className="grid gap-4 border border-bone/15 bg-ink/20 p-6">
        <p className="font-display uppercase tracking-wider text-electric text-sm">Push a ready-to-log meal</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className={labelCls}>Meal name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Post-workout shake" className={inputCls + " mt-1"} /></label>
          <label className="block"><span className={labelCls}>Assign to</span>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none">
              <option value="">All my clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.username}</option>)}
            </select></label>
        </div>
        <div className="grid gap-2">
          <span className={labelCls}>Foods (macros per item)</span>
          <div className="hidden sm:grid grid-cols-[1.6fr_1fr_0.7fr_0.6fr_0.6fr_0.6fr_28px] gap-2 text-[10px] uppercase tracking-wider text-bone/40">
            <span>Food</span><span>Amount</span><span>Cal</span><span>P</span><span>C</span><span>F</span><span /></div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_0.7fr_0.6fr_0.6fr_0.6fr_28px] gap-2">
              <input value={row.name} onChange={(e) => upd(i, "name", e.target.value)} placeholder="Food" className={inputCls} />
              <input value={row.label} onChange={(e) => upd(i, "label", e.target.value)} placeholder="e.g. 1 scoop" className={inputCls} />
              <input value={row.cal} onChange={(e) => upd(i, "cal", e.target.value)} placeholder="Cal" type="number" className={inputCls} />
              <input value={row.p} onChange={(e) => upd(i, "p", e.target.value)} placeholder="P" type="number" className={inputCls} />
              <input value={row.c} onChange={(e) => upd(i, "c", e.target.value)} placeholder="C" type="number" className={inputCls} />
              <input value={row.f} onChange={(e) => upd(i, "f", e.target.value)} placeholder="F" type="number" className={inputCls} />
              <button type="button" onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r))} className="text-bone/40 hover:text-electric">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setRows((r) => [...r, emptyRow()])} className="justify-self-start font-display uppercase tracking-wider text-xs text-electric hover:text-bone mt-1">+ Add food</button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="justify-self-start bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60">
          {saving ? "Saving…" : "Send Meal"}
        </button>
      </form>

      {/* ASSIGN MACRO GOALS (daily calories + protein/carbs/fat) */}
      <form onSubmit={saveMacros} className="grid gap-4 border border-electric/30 bg-electric/5 p-6">
        <div>
          <p className="font-display uppercase tracking-wider text-electric text-sm">Assign macro goals</p>
          <p className="text-xs text-bone/50 mt-1">Set a client&apos;s daily calories &amp; macros. They load straight into their Nutrition Tracker and they get a message.</p>
        </div>
        <label className="block sm:max-w-xs"><span className={labelCls}>Client *</span>
          <select value={mgClient} onChange={(e) => setMgClient(e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2 text-bone mt-1 focus:border-electric outline-none">
            <option value="">Choose a client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.username}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="block"><span className={labelCls}>Calories (kcal)</span>
            <input value={mg.calories} onChange={(e) => setMg((g) => ({ ...g, calories: e.target.value }))} type="number" placeholder="2200" className={inputCls + " mt-1"} /></label>
          <label className="block"><span className={labelCls}>Protein (g)</span>
            <input value={mg.protein} onChange={(e) => setMg((g) => ({ ...g, protein: e.target.value }))} type="number" placeholder="180" className={inputCls + " mt-1"} /></label>
          <label className="block"><span className={labelCls}>Carbs (g)</span>
            <input value={mg.carbs} onChange={(e) => setMg((g) => ({ ...g, carbs: e.target.value }))} type="number" placeholder="220" className={inputCls + " mt-1"} /></label>
          <label className="block"><span className={labelCls}>Fat (g)</span>
            <input value={mg.fat} onChange={(e) => setMg((g) => ({ ...g, fat: e.target.value }))} type="number" placeholder="70" className={inputCls + " mt-1"} /></label>
        </div>
        {mgMsg && <p className={"text-sm " + (mgMsg.includes("✓") ? "text-electric" : "text-red-400")}>{mgMsg}</p>}
        <button type="submit" disabled={mgSaving} className="justify-self-start bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60">
          {mgSaving ? "Sending…" : "Send macro goals"}
        </button>
      </form>

      <div>
        <p className="font-display uppercase tracking-wider text-bone/60 text-sm mb-4">Your meal templates ({meals.length})</p>
        {meals.length === 0 ? <p className="text-bone/50 text-sm">No meals yet.</p> : (
          <div className="grid gap-3">
            {meals.map((m) => (
              <div key={m.id} className="border border-bone/15 bg-ink/20 p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-display uppercase tracking-wider text-bone">{m.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-electric mt-1">{clientName(m.clientId)} · {(m.items || []).length} items · {Math.round((m.items || []).reduce((s: number, i: any) => s + (i.cal || 0), 0))} cal</p>
                </div>
                <button onClick={() => del(m.id)} className="text-bone/40 hover:text-electric text-sm">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
