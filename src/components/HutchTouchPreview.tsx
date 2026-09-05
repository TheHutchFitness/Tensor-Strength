"use client";

import { hutchTouchSessions, HUTCH_TOUCH_PRIMARIES } from "@/data/hutchTouchProgram";

export default function HutchTouchPreview() {
  // Show Week 1 "Session A" for Push / Pull / Legs as a taste of the full block.
  const samples = (["Push", "Pull", "Legs"] as const)
    .map((day) => hutchTouchSessions.find((s) => s.week === 1 && s.day === day && s.variant === "A"))
    .filter(Boolean) as typeof hutchTouchSessions;

  return (
    <section className="mt-16 border-t border-bone/10 pt-14">
      <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">
        Free Preview
      </p>
      <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
        The Hutch Touch — <span className="text-electric">Week 1.</span>
      </h2>
      <p className="mt-4 text-bone/70 leading-relaxed max-w-2xl">
        A look inside Hutch&apos;s real 8‑week, 6‑day Push / Pull / Legs performance
        block. Here&apos;s Week 1, Session A for each day — the full program (16
        workouts per category, tracker &amp; PDF) unlocks with a free account.
      </p>

      <div className="mt-8 grid md:grid-cols-3 gap-5">
        {samples.map((s) => {
          const shown = s.exercises.slice(0, 4);
          const hidden = s.exercises.length - shown.length;
          return (
            <div key={s.day} className="border border-bone/15 bg-ink/30 p-5">
              <p className="font-display uppercase tracking-wider text-electric text-sm">{s.day}</p>
              <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-1">
                Primary: {HUTCH_TOUCH_PRIMARIES[s.day]}
              </p>
              <ul className="mt-4 grid gap-2">
                {shown.map((ex, i) => (
                  <li key={i} className="text-sm border-l-2 border-electric/40 pl-3">
                    <span className="font-display uppercase tracking-wider text-bone/90">{ex.exercise}</span>
                    <span className="text-bone/50"> · {ex.sets}</span>
                  </li>
                ))}
              </ul>
              {hidden > 0 && (
                <div className="mt-4 relative">
                  <div className="blur-[3px] select-none pointer-events-none grid gap-2 opacity-60">
                    {s.exercises.slice(4, 4 + Math.min(hidden, 3)).map((ex, i) => (
                      <div key={i} className="text-sm border-l-2 border-bone/20 pl-3">
                        <span className="font-display uppercase tracking-wider">{ex.exercise}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-electric">
                    + {hidden} more locked
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <a
          href="/login"
          className="bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
        >
          Create a free account to unlock →
        </a>
        <span className="text-sm text-bone/50">Full 8 weeks · A/B sessions · downloadable tracker &amp; PDF</span>
      </div>

      {/* Locked tool suite preview */}
      <div className="mt-16">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">
          Inside the Portal
        </p>
        <h3 className="glow font-display uppercase text-2xl md:text-3xl font-700 leading-tight">
          Your full <span className="text-electric">toolkit.</span>
        </h3>
        <p className="mt-3 text-bone/70 leading-relaxed max-w-2xl">
          Members get a complete training suite — here&apos;s what unlocks with a free account.
        </p>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "Workout Tracker", desc: "Log every set, rep and RPE. Load programs straight in." },
            { name: "Nutrition / Meal Tracker", desc: "Track calories, macros, meals & supplements daily." },
            { name: "Macro Calculator", desc: "Dial in your calories and macros for your goal." },
            { name: "PR Tracker", desc: "Track your bests across every lift over time." },
            { name: "Exercise & Warmup Library", desc: "Hundreds of movements with coaching cues." },
            { name: "Weekly Check-Ins", desc: "Send progress to your coach and get adjustments." },
          ].map((t) => (
            <div key={t.name} className="relative border border-bone/15 bg-ink/30 p-5 overflow-hidden">
              <div className="opacity-40 grayscale pointer-events-none select-none">
                <p className="font-display uppercase tracking-wider text-bone">{t.name}</p>
                <p className="text-sm text-bone/60 mt-2 leading-relaxed">{t.desc}</p>
                <div className="mt-4 h-16 border border-bone/10 bg-ink/40" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-[1px]">
                <span className="flex items-center gap-2 font-display uppercase tracking-wider text-xs text-electric border border-electric/50 px-3 py-1.5 bg-ink/70">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Locked
                </span>
              </div>
            </div>
          ))}
        </div>

        <a
          href="/login"
          className="mt-8 inline-block border-2 border-electric text-electric px-8 py-4 font-display uppercase tracking-wider hover:bg-electric hover:text-ink transition-colors"
        >
          Unlock the full toolkit — free →
        </a>
      </div>
    </section>
  );
}
