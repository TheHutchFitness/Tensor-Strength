"use client";

import { useMemo, useState } from "react";
import { useCloudState } from "../../lib/cloud";

type Tab = "foods" | "recipes" | "water" | "cycle" | "adherence";
const card = "border border-bone/15 bg-ink/20 p-5";
const label = "block text-[11px] uppercase tracking-wider text-bone/50 mb-1 font-display";
const input = "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none min-w-0";
const btn = "font-display uppercase tracking-wider text-sm bg-electric text-ink px-5 py-2.5 hover:bg-bone transition-colors disabled:opacity-50";
const ghost = "font-display uppercase tracking-wider text-xs border border-bone/25 text-bone/70 px-4 py-2 hover:border-electric hover:text-electric transition-colors";
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const read = (k: string, d: any) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch { return d; } };
const write = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v));
const num = (v: any) => Number(v) || 0;

/* ---------- Custom Foods Library ---------- */
function CustomFoods() {
  const KEY = "ts-custom-foods";
  const [foods, save] = useCloudState<any[]>(KEY, []);
  const [f, setF] = useState({ name: "", cal: "", p: "", c: "", fat: "" });
  const add = () => { if (!f.name.trim()) return; save([...foods, { id: Math.random().toString(36).slice(2), name: f.name.trim(), cal: num(f.cal), p: num(f.p), c: num(f.c), f: num(f.fat) }]); setF({ name: "", cal: "", p: "", c: "", fat: "" }); };
  return (
    <div className="grid gap-4 max-w-xl">
      <p className="text-bone/60 text-sm">Save foods you eat often (per serving) for quick reference.</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
        <div className="col-span-2 sm:col-span-1"><label className={label}>Name</label><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className={label}>Cal</label><input className={input} inputMode="numeric" value={f.cal} onChange={(e) => setF({ ...f, cal: e.target.value })} /></div>
        <div><label className={label}>P</label><input className={input} inputMode="numeric" value={f.p} onChange={(e) => setF({ ...f, p: e.target.value })} /></div>
        <div><label className={label}>C</label><input className={input} inputMode="numeric" value={f.c} onChange={(e) => setF({ ...f, c: e.target.value })} /></div>
        <div><label className={label}>F</label><input className={input} inputMode="numeric" value={f.fat} onChange={(e) => setF({ ...f, fat: e.target.value })} /></div>
      </div>
      <button className={btn} onClick={add} disabled={!f.name.trim()}>Add food</button>
      <div className="grid gap-2">
        {foods.map((x) => (
          <div key={x.id} className={card + " flex items-center justify-between"}>
            <span><span className="font-display uppercase tracking-wider text-bone">{x.name}</span> <span className="text-bone/50 text-xs">{x.cal} kcal · {x.p}p / {x.c}c / {x.f}f</span></span>
            <button onClick={() => save(foods.filter((y) => y.id !== x.id))} className="text-bone/40 hover:text-electric">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Recipe Builder ---------- */
function Recipes() {
  const KEY = "ts-recipes";
  const [recipes, save] = useCloudState<any[]>(KEY, []);
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [items, setItems] = useState<any[]>([]);
  const [it, setIt] = useState({ name: "", cal: "", p: "", c: "", fat: "" });
  const totals = items.reduce((t, x) => ({ cal: t.cal + num(x.cal), p: t.p + num(x.p), c: t.c + num(x.c), f: t.f + num(x.f) }), { cal: 0, p: 0, c: 0, f: 0 });
  const s = Math.max(1, num(servings));
  const per = { cal: Math.round(totals.cal / s), p: Math.round(totals.p / s), c: Math.round(totals.c / s), f: Math.round(totals.f / s) };
  return (
    <div className="grid gap-4 max-w-xl">
      <p className="text-bone/60 text-sm">Combine ingredients into a recipe and get per-serving macros.</p>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={label}>Recipe name</label><input className={input} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className={label}>Servings</label><input className={input} inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
        <div className="col-span-2 sm:col-span-1"><label className={label}>Ingredient</label><input className={input} value={it.name} onChange={(e) => setIt({ ...it, name: e.target.value })} /></div>
        <div><label className={label}>Cal</label><input className={input} inputMode="numeric" value={it.cal} onChange={(e) => setIt({ ...it, cal: e.target.value })} /></div>
        <div><label className={label}>P</label><input className={input} inputMode="numeric" value={it.p} onChange={(e) => setIt({ ...it, p: e.target.value })} /></div>
        <div><label className={label}>C</label><input className={input} inputMode="numeric" value={it.c} onChange={(e) => setIt({ ...it, c: e.target.value })} /></div>
        <div><label className={label}>F</label><input className={input} inputMode="numeric" value={it.fat} onChange={(e) => setIt({ ...it, fat: e.target.value })} /></div>
      </div>
      <button className={ghost} onClick={() => { if (it.name.trim()) { setItems([...items, { ...it, f: num(it.fat) }]); setIt({ name: "", cal: "", p: "", c: "", fat: "" }); } }}>+ Add ingredient</button>
      {items.length > 0 && (
        <div className={card}>
          {items.map((x, i) => (<div key={i} className="flex justify-between border-b border-bone/5 py-1 text-sm"><span className="text-bone/70">{x.name}</span><span className="text-bone/50">{num(x.cal)} kcal</span></div>))}
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[["Cal", per.cal], ["P", per.p], ["C", per.c], ["F", per.f]].map(([k, v]) => (<div key={k as string}><p className="text-xl font-display text-electric">{v as number}</p><p className="text-[10px] uppercase tracking-wider text-bone/50">{k as string}/serving</p></div>))}
          </div>
          <button className={btn + " mt-3"} onClick={() => { if (name.trim()) { save([{ id: Math.random().toString(36).slice(2), name: name.trim(), per }, ...recipes]); setName(""); setItems([]); } }}>Save recipe</button>
        </div>
      )}
      <div className="grid gap-2">
        {recipes.map((r) => (<div key={r.id} className={card + " flex items-center justify-between"}><span><span className="font-display uppercase tracking-wider text-bone">{r.name}</span> <span className="text-bone/50 text-xs">{r.per.cal} kcal · {r.per.p}p / {r.per.c}c / {r.per.f}f per serving</span></span><button onClick={() => save(recipes.filter((y) => y.id !== r.id))} className="text-bone/40 hover:text-electric">✕</button></div>))}
      </div>
    </div>
  );
}

/* ---------- Water Tracker ---------- */
function Water() {
  const KEY = "ts-water", GKEY = "ts-water-goal";
  const today = new Date().toISOString().slice(0, 10);
  const [log, set] = useCloudState<Record<string, number>>(KEY, {});
  const [goal, setGoal] = useCloudState<number>(GKEY, 8);
  const count = log[today] || 0;
  const bump = (d: number) => set({ ...log, [today]: Math.max(0, count + d) });
  return (
    <div className="grid gap-4 max-w-md">
      <div><label className={label}>Daily goal (cups / glasses)</label><input className={input + " max-w-[120px]"} inputMode="numeric" value={goal} onChange={(e) => { setGoal(num(e.target.value)); }} /></div>
      <div className={card + " text-center"}>
        <p className="text-5xl font-display text-electric">{count}<span className="text-lg text-bone/40"> / {goal}</span></p>
        <div className="flex justify-center gap-1 my-3 flex-wrap">
          {Array.from({ length: goal }).map((_, i) => (<span key={i} className={"text-2xl " + (i < count ? "" : "opacity-25")}>💧</span>))}
        </div>
        <div className="flex justify-center gap-2">
          <button className={ghost} onClick={() => bump(-1)}>−</button>
          <button className={btn} onClick={() => bump(1)}>+ Add a glass</button>
        </div>
        {count >= goal && <p className="text-electric font-display uppercase tracking-wider text-xs mt-3">✓ Goal hit — nice hydration!</p>}
      </div>
    </div>
  );
}

/* ---------- Macro Cycling ---------- */
function Cycle() {
  const KEY = "ts-macro-cycle";
  const [plan, save] = useCloudState<Record<string, any>>(KEY, {});
  const todayKey = DAYS[(new Date().getDay() + 6) % 7];
  const upd = (day: string, k: string, v: string) => save({ ...plan, [day]: { ...(plan[day] || {}), [k]: num(v) } });
  return (
    <div className="grid gap-4">
      <p className="text-bone/60 text-sm">Set different targets per weekday (e.g. higher carbs on training days). Today is <span className="text-electric font-display uppercase">{todayKey}</span>.</p>
      <div className={card + " overflow-x-auto"}>
        <table className="w-full text-sm min-w-[440px]">
          <thead><tr className="text-bone/50 text-[10px] uppercase tracking-wider border-b border-bone/15"><th className="text-left py-2">Day</th><th className="py-2">Cal</th><th className="py-2">P</th><th className="py-2">C</th><th className="py-2">F</th></tr></thead>
          <tbody>
            {DAYS.map((d) => {
              const g = plan[d] || {};
              const cellCls = "w-16 bg-ink/40 border border-bone/20 px-2 py-1 text-bone text-center focus:border-electric outline-none";
              return (
                <tr key={d} className={"border-b border-bone/5 " + (d === todayKey ? "bg-electric/5" : "")}>
                  <td className="py-2 font-display uppercase tracking-wider text-bone">{d}{d === todayKey ? " ●" : ""}</td>
                  {["cal", "p", "c", "f"].map((k) => (<td key={k} className="text-center py-1"><input className={cellCls} inputMode="numeric" value={g[k] ?? ""} onChange={(e) => upd(d, k, e.target.value)} /></td>))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-bone/40">Saved automatically · use these as your daily targets in the tracker.</p>
    </div>
  );
}

/* ---------- Weekly Adherence ---------- */
function Adherence() {
  const data = useMemo(() => {
    const logs = read("ts-nutrition-log", {});
    const goal = read("ts-nutrition-goal", { calories: 2200 });
    const target = num(goal.calories) || 2200;
    // Sum calories per day by walking the day log for any {cal} entries.
    const sumDay = (day: any): number => {
      let cal = 0;
      const walk = (o: any) => {
        if (!o || typeof o !== "object") return;
        if (typeof o.cal === "number") cal += o.cal;
        if (Array.isArray(o)) o.forEach(walk); else Object.values(o).forEach(walk);
      };
      walk(day); return Math.round(cal);
    };
    const out: { date: string; cal: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); out.push({ date: key, cal: logs[key] ? sumDay(logs[key]) : 0 }); }
    const logged = out.filter((o) => o.cal > 0);
    const onTarget = logged.filter((o) => Math.abs(o.cal - target) <= target * 0.1).length;
    const avg = logged.length ? Math.round(logged.reduce((s, o) => s + o.cal, 0) / logged.length) : 0;
    return { out, target, loggedDays: logged.length, onTarget, avg };
  }, []);
  const max = Math.max(data.target, ...data.out.map((o) => o.cal), 1);
  return (
    <div className="grid gap-4 max-w-xl">
      <div className="grid grid-cols-3 gap-3">
        <div className={card + " text-center"}><p className="text-3xl font-display text-electric">{data.loggedDays}/7</p><p className="text-[10px] uppercase tracking-wider text-bone/50">Days logged</p></div>
        <div className={card + " text-center"}><p className="text-3xl font-display text-electric">{data.onTarget}</p><p className="text-[10px] uppercase tracking-wider text-bone/50">On target (±10%)</p></div>
        <div className={card + " text-center"}><p className="text-3xl font-display text-electric">{data.avg}</p><p className="text-[10px] uppercase tracking-wider text-bone/50">Avg kcal</p></div>
      </div>
      <div className={card}>
        <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-3">Last 7 days vs {data.target} kcal goal</p>
        <div className="flex items-end gap-2 h-32">
          {data.out.map((o) => {
            const hit = o.cal > 0 && Math.abs(o.cal - data.target) <= data.target * 0.1;
            return (
              <div key={o.date} className="flex-1 flex flex-col items-center gap-1">
                <div className={"w-full " + (hit ? "bg-electric" : o.cal ? "bg-amber-400/70" : "bg-bone/10")} style={{ height: `${(o.cal / max) * 100}%`, minHeight: o.cal ? 4 : 2 }} />
                <span className="text-[9px] text-bone/40">{o.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-bone/40">Pulled from your logged days in the tracker.</p>
    </div>
  );
}

export default function NutritionExtras() {
  const [t, setT] = useState<Tab>("foods");
  const tabs: { id: Tab; label: string }[] = [
    { id: "foods", label: "Custom Foods" },
    { id: "recipes", label: "Recipes" },
    { id: "water", label: "Water" },
    { id: "cycle", label: "Macro Cycling" },
    { id: "adherence", label: "Weekly Adherence" },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((x) => (<button key={x.id} onClick={() => setT(x.id)} className={"px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " + (t === x.id ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-bone/20")}>{x.label}</button>))}
      </div>
      {t === "foods" && <CustomFoods />}
      {t === "recipes" && <Recipes />}
      {t === "water" && <Water />}
      {t === "cycle" && <Cycle />}
      {t === "adherence" && <Adherence />}
    </div>
  );
}
