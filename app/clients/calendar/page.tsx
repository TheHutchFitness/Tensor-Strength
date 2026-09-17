"use client";

import { useEffect, useMemo, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";
import { hutchTouchSessions, type HutchTouchSessionId } from "../../../src/data/hutchTouchProgram";
import { parseWorkoutDate } from "../../../src/lib/workoutMetrics";

const HUTCH_ORDER: HutchTouchSessionId[] = ["push", "lower-pull", "upper-pull", "legs"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday-based
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week

  async function loadCalendar() {
    setLoading(true);
    setLoadError("");
    try {
      const me = await fetch("/api/auth/me");
      if (!me.ok) { window.location.href = "/login?from=/clients/calendar"; return; }
      const { user } = await me.json();
      if (!user.portalAccess) { window.location.href = "/clients"; return; }
      const tracker = await fetch("/api/client/tracker");
      if (!tracker.ok) throw new Error("Could not load workout history");
      const d = await tracker.json();
      setWorkouts(d?.workouts || []);
    } catch {
      setLoadError("Your training calendar could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCalendar();
  }, []);

  // Bucket workouts by day (YYYY-MM-DD)
  const byDay = useMemo(() => {
    const m: Record<string, { title: string }[]> = {};
    for (const w of workouts) {
      const t = parseWorkoutDate(w.date);
      if (!t) continue;
      const key = ymd(t);
      (m[key] = m[key] || []).push({ title: w.title || "Workout" });
    }
    return m;
  }, [workouts]);

  // Next-up rotation suggestion
  const nextSession = useMemo(() => {
    let lastId: HutchTouchSessionId | null = null;
    for (const w of workouts) {
      const found = hutchTouchSessions.find((s) => (w.title || "").startsWith(`The Hutch Touch — ${s.title}`));
      if (found) { lastId = found.id; break; }
    }
    const nextId = lastId ? HUTCH_ORDER[(HUTCH_ORDER.indexOf(lastId) + 1) % HUTCH_ORDER.length] : "push";
    return {
      id: nextId,
      title: hutchTouchSessions.find((s) => s.id === nextId)?.title || "Upper Body Push",
    };
  }, [workouts]);

  const weekStart = startOfWeek(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const todayKey = ymd(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const completedThisWeek = days.reduce((n, d) => n + (byDay[ymd(d)]?.length ? 1 : 0), 0);

  const label = weekOffset === 0 ? "This week" : weekOffset === -1 ? "Last week" : weekOffset === 1 ? "Next week" : `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">Training Calendar</p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          What&apos;s <span className="text-electric">on deck.</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
          See what you&apos;ve logged and what&apos;s next. Green days are done — keep the streak alive.
        </p>

        {loading ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">Loading…</p>
        ) : loadError ? (
          <div className="mt-8 border border-bone/20 bg-ink/30 p-6">
            <p className="text-sm text-bone/80">{loadError}</p>
            <button onClick={() => void loadCalendar()} className="mt-4 bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">Retry</button>
          </div>
        ) : (
          <>
            <div className="mt-8 flex items-center justify-between">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="font-display uppercase tracking-wider text-xs border border-bone/25 text-bone/70 px-4 py-2 hover:border-electric hover:text-electric transition-colors">← Prev</button>
              <div className="text-center">
                <p className="font-display uppercase tracking-wider text-electric">{label}</p>
                <p className="text-[11px] text-bone/50">{completedThisWeek} session{completedThisWeek === 1 ? "" : "s"} logged</p>
              </div>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="font-display uppercase tracking-wider text-xs border border-bone/25 text-bone/70 px-4 py-2 hover:border-electric hover:text-electric transition-colors">Next →</button>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2">
              {days.map((d, i) => {
                const key = ymd(d);
                const done = byDay[key] || [];
                const isToday = key === todayKey;
                return (
                  <div key={key} className={"border p-2 min-h-[92px] flex flex-col " + (done.length ? "border-electric bg-electric/10" : isToday ? "border-electric/50 bg-ink/40" : "border-bone/15 bg-ink/30")}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-bone/50">{DOW[i]}</span>
                      <span className={"text-[11px] font-display " + (isToday ? "text-electric" : "text-bone/60")}>{d.getDate()}</span>
                    </div>
                    <div className="mt-1 flex-1">
                      {done.length ? (
                        <div className="space-y-1">
                          {done.slice(0, 2).map((w, j) => (
                            <p key={j} className="text-[10px] leading-tight text-bone/80 truncate" title={w.title}>✓ {w.title}</p>
                          ))}
                          {done.length > 2 && <p className="text-[10px] text-bone/50">+{done.length - 2} more</p>}
                        </div>
                      ) : isToday ? (
                        <p className="text-[10px] text-electric leading-tight">Next: {nextSession.title}</p>
                      ) : (
                        <span className="text-[10px] text-bone/30">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-2 border-electric/40 bg-electric/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-bone/50">Next up</p>
                <p className="font-display uppercase tracking-wider text-bone mt-1">{nextSession.title}</p>
              </div>
              <a href={`/clients/workout-log?session=${encodeURIComponent(nextSession.id)}`} className="bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors whitespace-nowrap">Open next workout →</a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
