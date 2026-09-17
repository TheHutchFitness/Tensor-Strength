"use client";

import { useEffect, useState } from "react";

export default function OnboardingChecklist({ intakeDone, userId, accessType }: { intakeDone: boolean; userId: string; accessType?: string }) {
  const [workoutDone, setWorkoutDone] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/client/tracker")
      .then((r) => (r.ok ? r.json() : { workouts: [] }))
      .then((d) => setWorkoutDone((d.workouts || []).length > 0))
      .catch(() => setWorkoutDone(false));
    try { setDismissed(localStorage.getItem(`ts_onboard_done:${userId}`) === "1"); } catch {}
  }, [userId]);

  if (workoutDone === null) return null;
  const steps = [
    { done: intakeDone, label: "Complete your intake", href: "/clients/intake", cta: "Start" },
    { done: workoutDone, label: "Log your first workout", href: "/clients/workout-log", cta: "Log" },
  ];
  const allEssentialDone = intakeDone && workoutDone;
  if (allEssentialDone || dismissed) return null;

  return (
    <div className="mb-10 border-2 border-bone/20 bg-ink/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="glow font-display uppercase tracking-[0.2em] text-electric text-sm">Get started — {steps.filter((s) => s.done).length}/{steps.length}</p>
        <button onClick={() => { try { localStorage.setItem(`ts_onboard_done:${userId}`, "1"); } catch {} setDismissed(true); }} className="text-bone/40 hover:text-electric text-xs" title="Hide" aria-label="Dismiss onboarding checklist">✕</button>
      </div>
      <div className="grid gap-2">
        {steps.map((s, i) => (
          <div key={i} className={"flex items-center justify-between border px-4 py-3 " + (s.done ? "border-electric/40 bg-electric/5" : "border-bone/15 bg-ink/40")}>
            <span className={"flex items-center gap-3 " + (s.done ? "text-bone/60 line-through" : "text-bone")}>
              <span className={"h-5 w-5 rounded-full flex items-center justify-center text-[11px] " + (s.done ? "bg-electric text-ink" : "border border-bone/40 text-bone/40")}>{s.done ? "✓" : i + 1}</span>
              {s.label}
            </span>
            {!s.done && (
              <a href={s.href} className="shrink-0 font-display uppercase tracking-wider text-xs border border-electric text-electric px-3 py-1.5 hover:bg-electric hover:text-ink transition-colors">{s.cta} →</a>
            )}
          </div>
        ))}
      </div>
      {(accessType === "in_person" || accessType === "remote_coaching") &&
        <a href="/clients/book" className="mt-3 inline-block text-sm text-electric">{accessType === "remote_coaching" ? "Schedule your coaching call" : "Book a training session"} →</a>}
    </div>
  );
}
