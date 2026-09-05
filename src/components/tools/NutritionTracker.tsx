"use client";

import { useEffect, useMemo, useState } from "react";

type Food = { id: string; name: string; cal: number; p: number; c: number; f: number; qty: number };
type Meal = "breakfast" | "lunch" | "dinner" | "snacks";
type DayLog = Record<Meal, Food[]>;
type Goal = { calories: number; protein: number; carbs: number; fat: number };

const LOG_KEY = "ts-nutrition-log";
const GOAL_KEY = "ts-nutrition-goal";

const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
];

const QUICK_FOODS: Omit<Food, "id" | "qty">[] = [
  { name: "Chicken Breast (100g)", cal: 165, p: 31, c: 0, f: 3.6 },
  { name: "White Rice, cooked (100g)", cal: 130, p: 2.7, c: 28, f: 0.3 },
  { name: "Whole Egg (1 large)", cal: 78, p: 6, c: 0.6, f: 5 },
  { name: "Oats, dry (40g)", cal: 150, p: 5, c: 27, f: 3 },
  { name: "Banana (1 medium)", cal: 105, p: 1.3, c: 27, f: 0.4 },
  { name: "Greek Yogurt, plain (170g)", cal: 100, p: 17, c: 6, f: 0.7 },
  { name: "Whey Scoop (30g)", cal: 120, p: 24, c: 3, f: 1.5 },
  { name: "Almonds (28g)", cal: 164, p: 6, c: 6, f: 14 },
  { name: "Salmon (100g)", cal: 208, p: 20, c: 0, f: 13 },
  { name: "Sweet Potato (100g)", cal: 86, p: 1.6, c: 20, f: 0.1 },
];

function uid() {
  return Math.random().toString(36).slice(2);
}
function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function emptyDay(): DayLog {
  return { breakfast: [], lunch: [], dinner: [], snacks: [] };
}
function round(n: number) {
  return Math.round(n * 10) / 10;
}

export default function NutritionTracker() {
  const [allLogs, setAllLogs] = useState<Record<string, DayLog>>({});
  const [goal, setGoal] = useState<Goal>({ calories: 2200, protein: 170, carbs: 220, fat: 70 });
  const [date, setDate] = useState<Date>(new Date());
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState<Goal>(goal);
  const [addTo, setAddTo] = useState<Meal | null>(null);
  const [form, setForm] = useState({ name: "", cal: "", p: "", c: "", f: "", qty: "1" });

  useEffect(() => {
    try {
      const l = localStorage.getItem(LOG_KEY);
      if (l) setAllLogs(JSON.parse(l));
      const g = localStorage.getItem(GOAL_KEY);
      if (g) {
        const parsed = JSON.parse(g);
        setGoal(parsed);
        setGoalDraft(parsed);
      }
    } catch {}
  }, []);

  const key = dateKey(date);
  const day = allLogs[key] || emptyDay();

  function persist(next: Record<string, DayLog>) {
    setAllLogs(next);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  }

  function addFood(meal: Meal, food: Food) {
    const next = { ...allLogs, [key]: { ...emptyDay(), ...(allLogs[key] || {}) } };
    next[key][meal] = [...next[key][meal], food];
    persist(next);
  }

  function removeFood(meal: Meal, id: string) {
    if (!allLogs[key]) return;
    const next = { ...allLogs, [key]: { ...allLogs[key] } };
    next[key][meal] = next[key][meal].filter((f) => f.id !== id);
    persist(next);
  }

  function submitFood(e: React.FormEvent) {
    e.preventDefault();
    if (!addTo || !form.name.trim()) return;
    const qty = parseFloat(form.qty) || 1;
    addFood(addTo, {
      id: uid(),
      name: form.name.trim(),
      cal: parseFloat(form.cal) || 0,
      p: parseFloat(form.p) || 0,
      c: parseFloat(form.c) || 0,
      f: parseFloat(form.f) || 0,
      qty,
    });
    setForm({ name: "", cal: "", p: "", c: "", f: "", qty: "1" });
  }

  function quickAdd(meal: Meal, qf: Omit<Food, "id" | "qty">) {
    addFood(meal, { ...qf, id: uid(), qty: 1 });
  }

  function saveGoal() {
    setGoal(goalDraft);
    localStorage.setItem(GOAL_KEY, JSON.stringify(goalDraft));
    setEditingGoal(false);
  }

  const totals = useMemo(() => {
    const t = { cal: 0, p: 0, c: 0, f: 0 };
    (Object.keys(day) as Meal[]).forEach((m) => {
      day[m].forEach((food) => {
        t.cal += food.cal * food.qty;
        t.p += food.p * food.qty;
        t.c += food.c * food.qty;
        t.f += food.f * food.qty;
      });
    });
    return t;
  }, [day]);

  function mealTotals(meal: Meal) {
    return day[meal].reduce((s, f) => s + f.cal * f.qty, 0);
  }

  function shiftDay(n: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d);
    setAddTo(null);
  }

  const inputCls = "w-full bg-ink/40 border border-bone/20 px-2 py-1.5 text-bone text-sm focus:border-electric outline-none";
  const isToday = dateKey(new Date()) === key;

  function Bar({ value, max, label, unit }: { value: number; max: number; label: string; unit: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const over = value > max && max > 0;
    return (
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-bone/50">{label}</span>
          <span className={"font-display text-sm " + (over ? "text-red-400" : "text-bone/80")}>
            {round(value)}<span className="text-bone/40">/{max}{unit}</span>
          </span>
        </div>
        <div className="h-2 bg-ink/60 border border-bone/10 overflow-hidden">
          <div className={"h-full " + (over ? "bg-red-400" : "bg-electric")} style={{ width: pct + "%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {/* Date + goals summary */}
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="border border-bone/15 bg-ink/20 p-5">
          <div className="flex items-center justify-between">
            <button onClick={() => shiftDay(-1)} className="font-display text-electric hover:text-bone px-2">←</button>
            <div className="text-center">
              <p className="font-display uppercase tracking-wider text-bone">
                {isToday ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className="text-xs text-bone/50">{date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <button onClick={() => shiftDay(1)} className="font-display text-electric hover:text-bone px-2">→</button>
          </div>
          <div className="mt-5 text-center">
            <p className="font-display text-4xl text-electric font-700">{round(totals.cal)}</p>
            <p className="text-[10px] uppercase tracking-wider text-bone/50 mt-1">
              of {goal.calories} kcal · {Math.max(0, Math.round(goal.calories - totals.cal))} left
            </p>
          </div>
        </div>

        <div className="border border-bone/15 bg-ink/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display uppercase tracking-wider text-bone/60 text-xs">Daily Goals</p>
            <button
              onClick={() => { setGoalDraft(goal); setEditingGoal((v) => !v); }}
              className="font-display uppercase tracking-wider text-xs text-electric hover:text-bone"
            >
              {editingGoal ? "Cancel" : "Edit goals"}
            </button>
          </div>
          {editingGoal ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["calories", "protein", "carbs", "fat"] as (keyof Goal)[]).map((k) => (
                <label key={k} className="block">
                  <span className="text-[10px] uppercase tracking-wider text-bone/50">{k}</span>
                  <input
                    type="number"
                    value={goalDraft[k]}
                    onChange={(e) => setGoalDraft({ ...goalDraft, [k]: parseFloat(e.target.value) || 0 })}
                    className={inputCls + " mt-1"}
                  />
                </label>
              ))}
              <button onClick={saveGoal} className="col-span-2 sm:col-span-4 bg-electric text-ink py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">
                Save Goals
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Bar value={totals.cal} max={goal.calories} label="Calories" unit="" />
              <Bar value={totals.p} max={goal.protein} label="Protein" unit="g" />
              <Bar value={totals.c} max={goal.carbs} label="Carbs" unit="g" />
              <Bar value={totals.f} max={goal.fat} label="Fat" unit="g" />
            </div>
          )}
        </div>
      </div>

      {/* Meals */}
      <div className="grid gap-4">
        {MEALS.map((meal) => (
          <div key={meal.id} className="border border-bone/15 bg-ink/20">
            <div className="flex items-center justify-between px-5 py-3 border-b border-bone/10">
              <p className="font-display uppercase tracking-wider text-bone">{meal.label}</p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-electric font-display">{round(mealTotals(meal.id))} kcal</span>
                <button
                  onClick={() => setAddTo(addTo === meal.id ? null : meal.id)}
                  className="font-display uppercase tracking-wider text-xs border border-electric text-electric px-3 py-1.5 hover:bg-electric hover:text-ink transition-colors"
                >
                  {addTo === meal.id ? "Close" : "+ Add Food"}
                </button>
              </div>
            </div>

            {/* Food entries */}
            {day[meal.id].length > 0 && (
              <ul className="divide-y divide-bone/5">
                {day[meal.id].map((f) => (
                  <li key={f.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-bone/90 truncate">
                        {f.name}{f.qty !== 1 ? ` ×${f.qty}` : ""}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-0.5">
                        {round(f.p * f.qty)}p · {round(f.c * f.qty)}c · {round(f.f * f.qty)}f
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-display text-sm text-bone/80">{round(f.cal * f.qty)}</span>
                      <button onClick={() => removeFood(meal.id, f.id)} className="text-bone/40 hover:text-electric text-sm">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Add food panel */}
            {addTo === meal.id && (
              <div className="px-5 py-4 border-t border-bone/10 bg-ink/30">
                <form onSubmit={submitFood} className="grid gap-2">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Food name" className={inputCls + " col-span-2 sm:col-span-2"} />
                    <input value={form.cal} onChange={(e) => setForm({ ...form, cal: e.target.value })} placeholder="Cal" type="number" className={inputCls} />
                    <input value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })} placeholder="P (g)" type="number" className={inputCls} />
                    <input value={form.c} onChange={(e) => setForm({ ...form, c: e.target.value })} placeholder="C (g)" type="number" className={inputCls} />
                    <input value={form.f} onChange={(e) => setForm({ ...form, f: e.target.value })} placeholder="F (g)" type="number" className={inputCls} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-bone/50">Servings</label>
                    <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} type="number" step="0.25" className={inputCls + " w-24"} />
                    <button type="submit" className="ml-auto bg-electric text-ink px-5 py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">
                      Add
                    </button>
                  </div>
                </form>

                <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-4 mb-2">Quick add</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FOODS.map((qf) => (
                    <button
                      key={qf.name}
                      onClick={() => quickAdd(meal.id, qf)}
                      className="text-xs border border-bone/20 text-bone/70 px-2.5 py-1.5 hover:border-electric hover:text-electric transition-colors"
                    >
                      {qf.name} · {qf.cal}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-bone/40">
        Your food log saves right on this device. Set your targets with the Macro Calculator in the client tools.
      </p>
    </div>
  );
}
