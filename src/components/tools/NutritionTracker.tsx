"use client";

import { useEffect, useMemo, useState } from "react";

type Food = { name: string; cuisine: string; cal: number; p: number; c: number; f: number; diets: string[] };
type Entry = { id: string; name: string; label: string; cal: number; p: number; c: number; f: number };
type Meal = "breakfast" | "lunch" | "dinner" | "snacks";
type DayLog = Record<Meal, Entry[]>;
type Goal = { calories: number; protein: number; carbs: number; fat: number };
type Unit = "g" | "oz" | "ml" | "l";

const LOG_KEY = "ts-nutrition-log";
const GOAL_KEY = "ts-nutrition-goal";
const DIET_KEY = "ts-nutrition-diet";

const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
];

const DIETS = ["balanced", "vegetarian", "vegan", "keto", "carnivore"];
const CUISINES = ["all", "general", "american", "indian", "mexican", "chinese", "takeout"];

// Macros are per 100 g / 100 ml.
const FOODS: Food[] = [
  // General / staples
  { name: "Chicken Breast", cuisine: "general", cal: 165, p: 31, c: 0, f: 3.6, diets: ["keto", "carnivore"] },
  { name: "Salmon", cuisine: "general", cal: 208, p: 20, c: 0, f: 13, diets: ["keto", "carnivore"] },
  { name: "Whole Egg", cuisine: "general", cal: 143, p: 13, c: 1.1, f: 9.5, diets: ["vegetarian", "keto", "carnivore"] },
  { name: "Greek Yogurt (plain)", cuisine: "general", cal: 59, p: 10, c: 3.6, f: 0.4, diets: ["vegetarian", "keto"] },
  { name: "Whey Protein", cuisine: "general", cal: 400, p: 80, c: 10, f: 5, diets: ["vegetarian", "keto"] },
  { name: "Almonds", cuisine: "general", cal: 579, p: 21, c: 22, f: 50, diets: ["vegan", "vegetarian", "keto"] },
  { name: "White Rice (cooked)", cuisine: "general", cal: 130, p: 2.7, c: 28, f: 0.3, diets: ["vegan", "vegetarian"] },
  { name: "Oats (dry)", cuisine: "general", cal: 389, p: 17, c: 66, f: 7, diets: ["vegan", "vegetarian"] },
  { name: "Banana", cuisine: "general", cal: 89, p: 1.1, c: 23, f: 0.3, diets: ["vegan", "vegetarian"] },
  { name: "Sweet Potato", cuisine: "general", cal: 86, p: 1.6, c: 20, f: 0.1, diets: ["vegan", "vegetarian"] },
  { name: "Broccoli", cuisine: "general", cal: 34, p: 2.8, c: 7, f: 0.4, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Avocado", cuisine: "general", cal: 160, p: 2, c: 9, f: 15, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Olive Oil", cuisine: "general", cal: 884, p: 0, c: 0, f: 100, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Ground Beef (80/20)", cuisine: "general", cal: 254, p: 17, c: 0, f: 20, diets: ["keto", "carnivore"] },
  { name: "Sirloin Steak", cuisine: "general", cal: 206, p: 26, c: 0, f: 11, diets: ["keto", "carnivore"] },
  { name: "Tofu", cuisine: "general", cal: 76, p: 8, c: 1.9, f: 4.8, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Black Beans", cuisine: "general", cal: 132, p: 8.9, c: 24, f: 0.5, diets: ["vegan", "vegetarian"] },
  { name: "Peanut Butter", cuisine: "general", cal: 588, p: 25, c: 20, f: 50, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Cheddar Cheese", cuisine: "general", cal: 402, p: 25, c: 1.3, f: 33, diets: ["vegetarian", "keto", "carnivore"] },
  { name: "Milk (2%)", cuisine: "general", cal: 50, p: 3.4, c: 4.8, f: 2, diets: ["vegetarian"] },
  { name: "Cottage Cheese", cuisine: "general", cal: 98, p: 11, c: 3.4, f: 4.3, diets: ["vegetarian", "keto"] },
  { name: "Tuna (canned)", cuisine: "general", cal: 116, p: 26, c: 0, f: 1, diets: ["keto", "carnivore"] },
  // American
  { name: "Cheeseburger", cuisine: "american", cal: 254, p: 13, c: 19, f: 13, diets: [] },
  { name: "Hot Dog", cuisine: "american", cal: 290, p: 10, c: 4, f: 26, diets: ["keto"] },
  { name: "Pancakes", cuisine: "american", cal: 227, p: 6, c: 28, f: 9, diets: ["vegetarian"] },
  { name: "BBQ Ribs", cuisine: "american", cal: 292, p: 22, c: 8, f: 19, diets: ["keto"] },
  { name: "Mac & Cheese", cuisine: "american", cal: 164, p: 6, c: 20, f: 6, diets: ["vegetarian"] },
  { name: "Buffalo Wings", cuisine: "american", cal: 285, p: 27, c: 1, f: 19, diets: ["keto", "carnivore"] },
  { name: "Caesar Salad w/ Chicken", cuisine: "american", cal: 190, p: 12, c: 6, f: 13, diets: ["keto"] },
  { name: "Grilled Cheese", cuisine: "american", cal: 350, p: 12, c: 28, f: 22, diets: ["vegetarian"] },
  { name: "Bacon", cuisine: "american", cal: 541, p: 37, c: 1.4, f: 42, diets: ["keto", "carnivore"] },
  { name: "Fried Chicken", cuisine: "american", cal: 246, p: 24, c: 8, f: 14, diets: [] },
  { name: "Meatloaf", cuisine: "american", cal: 210, p: 16, c: 8, f: 12, diets: [] },
  // Indian
  { name: "Butter Chicken", cuisine: "indian", cal: 180, p: 12, c: 6, f: 12, diets: ["keto"] },
  { name: "Chicken Tikka Masala", cuisine: "indian", cal: 155, p: 11, c: 6, f: 9, diets: [] },
  { name: "Paneer Tikka", cuisine: "indian", cal: 270, p: 16, c: 6, f: 20, diets: ["vegetarian", "keto"] },
  { name: "Dal (Lentil Curry)", cuisine: "indian", cal: 116, p: 6, c: 16, f: 3, diets: ["vegan", "vegetarian"] },
  { name: "Chana Masala", cuisine: "indian", cal: 130, p: 6, c: 18, f: 4, diets: ["vegan", "vegetarian"] },
  { name: "Palak Paneer", cuisine: "indian", cal: 180, p: 9, c: 8, f: 13, diets: ["vegetarian", "keto"] },
  { name: "Naan", cuisine: "indian", cal: 310, p: 9, c: 50, f: 8, diets: ["vegetarian"] },
  { name: "Tandoori Chicken", cuisine: "indian", cal: 150, p: 25, c: 2, f: 5, diets: ["keto", "carnivore"] },
  { name: "Aloo Gobi", cuisine: "indian", cal: 100, p: 3, c: 14, f: 4, diets: ["vegan", "vegetarian"] },
  { name: "Chicken Biryani", cuisine: "indian", cal: 180, p: 9, c: 24, f: 6, diets: [] },
  { name: "Samosa", cuisine: "indian", cal: 262, p: 4, c: 32, f: 13, diets: ["vegan", "vegetarian"] },
  // Mexican
  { name: "Chicken Burrito", cuisine: "mexican", cal: 206, p: 12, c: 24, f: 7, diets: [] },
  { name: "Beef Taco", cuisine: "mexican", cal: 226, p: 9, c: 20, f: 13, diets: [] },
  { name: "Guacamole", cuisine: "mexican", cal: 160, p: 2, c: 9, f: 15, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Cheese Quesadilla", cuisine: "mexican", cal: 300, p: 13, c: 26, f: 16, diets: ["vegetarian"] },
  { name: "Carnitas", cuisine: "mexican", cal: 275, p: 20, c: 1, f: 21, diets: ["keto", "carnivore"] },
  { name: "Refried Beans", cuisine: "mexican", cal: 120, p: 7, c: 20, f: 2, diets: ["vegan", "vegetarian"] },
  { name: "Chicken Fajitas", cuisine: "mexican", cal: 150, p: 14, c: 8, f: 7, diets: ["keto"] },
  { name: "Nachos", cuisine: "mexican", cal: 343, p: 8, c: 35, f: 19, diets: ["vegetarian"] },
  { name: "Beef Enchiladas", cuisine: "mexican", cal: 180, p: 10, c: 18, f: 8, diets: [] },
  { name: "Salsa", cuisine: "mexican", cal: 36, p: 1.5, c: 7, f: 0.2, diets: ["vegan", "vegetarian", "keto"] },
  // Chinese
  { name: "Kung Pao Chicken", cuisine: "chinese", cal: 185, p: 13, c: 9, f: 11, diets: [] },
  { name: "Veg Fried Rice", cuisine: "chinese", cal: 163, p: 5, c: 23, f: 5, diets: ["vegetarian"] },
  { name: "Beef & Broccoli", cuisine: "chinese", cal: 150, p: 12, c: 8, f: 8, diets: ["keto"] },
  { name: "Sweet & Sour Pork", cuisine: "chinese", cal: 250, p: 9, c: 30, f: 10, diets: [] },
  { name: "Veg Spring Roll", cuisine: "chinese", cal: 210, p: 5, c: 25, f: 10, diets: ["vegan", "vegetarian"] },
  { name: "Pork Dumplings", cuisine: "chinese", cal: 220, p: 9, c: 25, f: 9, diets: [] },
  { name: "General Tso's Chicken", cuisine: "chinese", cal: 250, p: 12, c: 28, f: 10, diets: [] },
  { name: "Chow Mein", cuisine: "chinese", cal: 200, p: 7, c: 25, f: 8, diets: ["vegetarian"] },
  { name: "Mapo Tofu", cuisine: "chinese", cal: 150, p: 9, c: 6, f: 10, diets: ["vegetarian", "keto"] },
  { name: "Wonton Soup", cuisine: "chinese", cal: 90, p: 6, c: 10, f: 3, diets: [] },
  // Takeout / popular
  { name: "Pepperoni Pizza", cuisine: "takeout", cal: 298, p: 13, c: 34, f: 12, diets: [] },
  { name: "Cheese Pizza", cuisine: "takeout", cal: 266, p: 11, c: 33, f: 10, diets: ["vegetarian"] },
  { name: "French Fries", cuisine: "takeout", cal: 312, p: 3.4, c: 41, f: 15, diets: ["vegan", "vegetarian"] },
  { name: "California Sushi Roll", cuisine: "takeout", cal: 130, p: 4, c: 24, f: 2, diets: [] },
  { name: "Chicken Shawarma", cuisine: "takeout", cal: 190, p: 17, c: 8, f: 10, diets: ["keto"] },
  { name: "Falafel", cuisine: "takeout", cal: 333, p: 13, c: 32, f: 18, diets: ["vegan", "vegetarian"] },
  { name: "Pad Thai", cuisine: "takeout", cal: 200, p: 9, c: 28, f: 6, diets: [] },
  { name: "Doner Kebab", cuisine: "takeout", cal: 215, p: 15, c: 10, f: 12, diets: ["keto"] },
  { name: "Fish & Chips", cuisine: "takeout", cal: 280, p: 12, c: 28, f: 14, diets: [] },
  { name: "Burrito Bowl", cuisine: "takeout", cal: 170, p: 10, c: 18, f: 6, diets: [] },
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
function gramsOf(amount: number, unit: Unit) {
  if (unit === "oz") return amount * 28.3495;
  if (unit === "l") return amount * 1000;
  return amount; // g and ml ~1:1
}

export default function NutritionTracker() {
  const [allLogs, setAllLogs] = useState<Record<string, DayLog>>({});
  const [goal, setGoal] = useState<Goal>({ calories: 2200, protein: 170, carbs: 220, fat: 70 });
  const [date, setDate] = useState<Date>(new Date());
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState<Goal>(goal);
  const [diet, setDiet] = useState("balanced");
  const [addTo, setAddTo] = useState<Meal | null>(null);
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<Unit>("g");
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [manual, setManual] = useState({ name: "", cal: "", p: "", c: "", f: "" });

  useEffect(() => {
    try {
      const l = localStorage.getItem(LOG_KEY);
      if (l) setAllLogs(JSON.parse(l));
      const g = localStorage.getItem(GOAL_KEY);
      if (g) { const p = JSON.parse(g); setGoal(p); setGoalDraft(p); }
      const d = localStorage.getItem(DIET_KEY);
      if (d) setDiet(d);
    } catch {}
  }, []);

  const key = dateKey(date);
  const day = allLogs[key] || emptyDay();

  function persist(next: Record<string, DayLog>) {
    setAllLogs(next);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  }
  function addEntry(meal: Meal, entry: Entry) {
    const next = { ...allLogs, [key]: { ...emptyDay(), ...(allLogs[key] || {}) } };
    next[key][meal] = [...next[key][meal], entry];
    persist(next);
  }
  function removeEntry(meal: Meal, id: string) {
    if (!allLogs[key]) return;
    const next = { ...allLogs, [key]: { ...allLogs[key] } };
    next[key][meal] = next[key][meal].filter((f) => f.id !== id);
    persist(next);
  }

  function addFoodToMeal(meal: Meal, food: Food) {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    const factor = gramsOf(amt, unit) / 100;
    addEntry(meal, {
      id: uid(),
      name: food.name,
      label: `${amt}${unit}`,
      cal: round(food.cal * factor),
      p: round(food.p * factor),
      c: round(food.c * factor),
      f: round(food.f * factor),
    });
  }

  function addManual(meal: Meal) {
    if (!manual.name.trim()) return;
    const amt = parseFloat(amount) || 0;
    addEntry(meal, {
      id: uid(),
      name: manual.name.trim(),
      label: amt ? `${amt}${unit}` : "",
      cal: parseFloat(manual.cal) || 0,
      p: parseFloat(manual.p) || 0,
      c: parseFloat(manual.c) || 0,
      f: parseFloat(manual.f) || 0,
    });
    setManual({ name: "", cal: "", p: "", c: "", f: "" });
  }

  function saveGoal() {
    setGoal(goalDraft);
    localStorage.setItem(GOAL_KEY, JSON.stringify(goalDraft));
    setEditingGoal(false);
  }
  function changeDiet(d: string) {
    setDiet(d);
    localStorage.setItem(DIET_KEY, d);
  }

  const totals = useMemo(() => {
    const t = { cal: 0, p: 0, c: 0, f: 0 };
    (Object.keys(day) as Meal[]).forEach((m) => day[m].forEach((e) => {
      t.cal += e.cal; t.p += e.p; t.c += e.c; t.f += e.f;
    }));
    return t;
  }, [day]);

  const foodList = useMemo(() => {
    return FOODS.filter((f) => {
      if (diet !== "balanced" && !f.diets.includes(diet)) return false;
      if (cuisine !== "all" && f.cuisine !== cuisine) return false;
      if (search.trim() && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [diet, cuisine, search]);

  function mealTotals(meal: Meal) {
    return day[meal].reduce((s, e) => s + e.cal, 0);
  }
  function shiftDay(n: number) {
    const d = new Date(date); d.setDate(d.getDate() + n); setDate(d); setAddTo(null);
  }

  const inputCls = "w-full bg-ink/40 border border-bone/20 px-2 py-1.5 text-bone text-sm focus:border-electric outline-none";
  const isToday = dateKey(new Date()) === key;

  function Bar({ value, max, label, unit: u }: { value: number; max: number; label: string; unit: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const over = value > max && max > 0;
    return (
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-bone/50">{label}</span>
          <span className={"font-display text-sm " + (over ? "text-red-400" : "text-bone/80")}>
            {round(value)}<span className="text-bone/40">/{max}{u}</span>
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
      {/* Diet selector */}
      <div className="border border-bone/15 bg-ink/20 p-5">
        <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-3">Your diet — filters the food list</p>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <button
              key={d}
              onClick={() => changeDiet(d)}
              className={"px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
                (diet === d ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:border-electric hover:text-electric")}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Date + goals */}
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="border border-bone/15 bg-ink/20 p-5">
          <div className="flex items-center justify-between">
            <button onClick={() => shiftDay(-1)} className="font-display text-electric hover:text-bone px-2">←</button>
            <div className="text-center">
              <p className="font-display uppercase tracking-wider text-bone">{isToday ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" })}</p>
              <p className="text-xs text-bone/50">{date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <button onClick={() => shiftDay(1)} className="font-display text-electric hover:text-bone px-2">→</button>
          </div>
          <div className="mt-5 text-center">
            <p className="font-display text-4xl text-electric font-700">{round(totals.cal)}</p>
            <p className="text-[10px] uppercase tracking-wider text-bone/50 mt-1">of {goal.calories} kcal · {Math.max(0, Math.round(goal.calories - totals.cal))} left</p>
          </div>
        </div>

        <div className="border border-bone/15 bg-ink/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display uppercase tracking-wider text-bone/60 text-xs">Daily Goals</p>
            <button onClick={() => { setGoalDraft(goal); setEditingGoal((v) => !v); }} className="font-display uppercase tracking-wider text-xs text-electric hover:text-bone">
              {editingGoal ? "Cancel" : "Edit goals"}
            </button>
          </div>
          {editingGoal ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["calories", "protein", "carbs", "fat"] as (keyof Goal)[]).map((k) => (
                <label key={k} className="block">
                  <span className="text-[10px] uppercase tracking-wider text-bone/50">{k}</span>
                  <input type="number" value={goalDraft[k]} onChange={(e) => setGoalDraft({ ...goalDraft, [k]: parseFloat(e.target.value) || 0 })} className={inputCls + " mt-1"} />
                </label>
              ))}
              <button onClick={saveGoal} className="col-span-2 sm:col-span-4 bg-electric text-ink py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">Save Goals</button>
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
                <button onClick={() => setAddTo(addTo === meal.id ? null : meal.id)} className="font-display uppercase tracking-wider text-xs border border-electric text-electric px-3 py-1.5 hover:bg-electric hover:text-ink transition-colors">
                  {addTo === meal.id ? "Close" : "+ Add Food"}
                </button>
              </div>
            </div>

            {day[meal.id].length > 0 && (
              <ul className="divide-y divide-bone/5">
                {day[meal.id].map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-bone/90 truncate">{e.name}{e.label ? ` · ${e.label}` : ""}</p>
                      <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-0.5">{e.p}p · {e.c}c · {e.f}f</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-display text-sm text-bone/80">{e.cal}</span>
                      <button onClick={() => removeEntry(meal.id, e.id)} className="text-bone/40 hover:text-electric text-sm">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {addTo === meal.id && (
              <div className="px-5 py-4 border-t border-bone/10 bg-ink/30">
                {/* Amount + unit */}
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-[10px] uppercase tracking-wider text-bone/50">Amount</label>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="any" className={inputCls + " w-24"} />
                  <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="bg-ink/60 border border-bone/20 px-2 py-1.5 text-bone text-sm focus:border-electric outline-none">
                    <option value="g">grams</option>
                    <option value="oz">oz</option>
                    <option value="ml">ml</option>
                    <option value="l">liters</option>
                  </select>
                  <span className="text-[10px] uppercase tracking-wider text-bone/40">tap a food to log this amount</span>
                </div>

                {/* Search + cuisine */}
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search foods…" className={inputCls + " mb-2"} />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CUISINES.map((c) => (
                    <button key={c} onClick={() => setCuisine(c)} className={"px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors " + (cuisine === c ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:border-electric")}>{c}</button>
                  ))}
                </div>

                <div className="max-h-56 overflow-y-auto flex flex-wrap gap-2 mb-4">
                  {foodList.length === 0 ? (
                    <p className="text-bone/40 text-sm py-4">No foods match this diet / search.</p>
                  ) : (
                    foodList.map((f) => (
                      <button key={f.name} onClick={() => addFoodToMeal(meal.id, f)} className="text-xs border border-bone/20 text-bone/70 px-2.5 py-1.5 hover:border-electric hover:text-electric transition-colors">
                        {f.name} <span className="text-bone/40">· {f.cal}/100g</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Custom food */}
                <div className="border-t border-bone/10 pt-3">
                  <p className="text-[10px] uppercase tracking-wider text-bone/50 mb-2">Custom food (totals for the amount above)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Name" className={inputCls + " col-span-2"} />
                    <input value={manual.cal} onChange={(e) => setManual({ ...manual, cal: e.target.value })} placeholder="Cal" type="number" className={inputCls} />
                    <input value={manual.p} onChange={(e) => setManual({ ...manual, p: e.target.value })} placeholder="P" type="number" className={inputCls} />
                    <input value={manual.c} onChange={(e) => setManual({ ...manual, c: e.target.value })} placeholder="C" type="number" className={inputCls} />
                    <input value={manual.f} onChange={(e) => setManual({ ...manual, f: e.target.value })} placeholder="F" type="number" className={inputCls} />
                  </div>
                  <button onClick={() => addManual(meal.id)} className="mt-2 bg-electric text-ink px-5 py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">Add custom</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-bone/40">
        Food macros are per 100g/ml and scale to your chosen amount. Your log saves on this device. Set targets with the Macro Calculator.
      </p>
    </div>
  );
}
