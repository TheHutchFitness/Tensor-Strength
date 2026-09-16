"use client";

import { useState } from "react";
import { hutchTouchSessions } from "../data/hutchTouchProgram";

type Demo = { name: string; desc: string; rows: string[] };

const TOOLS: Demo[] = [
  { name: "Workout Tracker", desc: "Log every set, rep and RPE. Load a program straight in and track your sessions.", rows: ["Back Squat — 3 × 5 @ RPE 8", "Set 1: 225 lb × 5  ·  RPE 8", "Set 2: 225 lb × 5  ·  RPE 8", "Bench Press — 3 × 8", "Set 1: 155 lb × 8  ·  RPE 7"] },
  { name: "Nutrition / Meal Tracker", desc: "Track calories, macros, meals and supplements every day against your goals.", rows: ["Calories 1,840 / 2,200 · 360 left", "Protein 165g  ·  Carbs 190g  ·  Fat 55g", "Breakfast — Oats + Whey  ·  420 cal", "Lunch — Chicken & Rice  ·  610 cal", "Supplements: Creatine ✓  Vit D3 ✓"] },
  { name: "Macro Calculator", desc: "Dial in calories and macros for your goal, then push them to your tracker.", rows: ["Goal: Lean bulk", "Calories: 2,200 kcal", "Protein: 170g  ·  Carbs: 220g  ·  Fat: 70g", "→ Use as my tracker goals"] },
  { name: "PR Tracker", desc: "Track your bests across every lift and watch the numbers climb over time.", rows: ["Squat PR: 315 lb  ▲ +10", "Bench PR: 225 lb  ▲ +5", "Deadlift PR: 405 lb", "Overhead Press PR: 135 lb"] },
  { name: "Exercise & Warmup Library", desc: "Hundreds of movements, plyometrics, isometrics and warm-ups with coaching cues.", rows: ["Back Squat — quads, glutes", "Romanian Deadlift — hamstrings", "Box Jump (plyometric)", "Copenhagen Plank (isometric)", "Full-Body RAMP Warm-up"] },
  { name: "Weekly Check-Ins", desc: "Send your week's progress to your coach and get program adjustments back.", rows: ["Week 3 · Readiness 8/10", "Wins: hit all sessions, +5 on bench", "Struggles: sleep was short", "Coach note: bump squat volume"] },
];

export default function HutchTouchPreview() {
  const [demo, setDemo] = useState<Demo | null>(null);

  function openDemo(t: Demo) {
    setDemo(t);
    try {
      localStorage.setItem("ts_last_demo", t.name);
      fetch("/api/analytics/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: t.name }),
      }).catch(() => {});
    } catch {}
  }
  // Show the first 3 rotation sessions as a taste of the full program.
  const samples = hutchTouchSessions.slice(0, 3);

  return (
    <section className="mt-16 border-t border-bone/10 pt-14">
      <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">
        Free Preview
      </p>
      <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
        The Hutch Touch — <span className="text-electric">the rotation.</span>
      </h2>
      <p className="mt-4 text-bone/70 leading-relaxed max-w-2xl">
        A look inside Hutch&apos;s real 4‑session performance rotation — Upper Push,
        Lower Pull, Upper Pull, and Legs. Here&apos;s a taste of three sessions; the
        full program (every exercise, the variation progressions &amp; the tracker)
        unlocks with a free account.
      </p>

      <div className="mt-8 grid md:grid-cols-3 gap-5">
        {samples.map((s) => {
          const shown = s.exercises.slice(0, 4);
          const hidden = s.exercises.length - shown.length;
          return (
            <div key={s.id} className="border border-bone/15 bg-ink/30 p-5">
              <p className="font-display uppercase tracking-wider text-electric text-sm">{s.title}</p>
              <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-1">
                Primary: {s.focus}
              </p>
              <ul className="mt-4 grid gap-2">
                {shown.map((ex, i) => (
                  <li key={i} className="text-sm border-l-2 border-electric/40 pl-3">
                    <span className="font-display uppercase tracking-wider text-bone/90">{ex.exercise}</span>
                    <span className="text-bone/50"> · {ex.sets} × {ex.reps}</span>
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
        <span className="text-sm text-bone/50">All 4 sessions · variation progressions · workout tracker</span>
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
          {TOOLS.map((t) => (
            <button
              key={t.name}
              onClick={() => setDemo(t)}
              className="relative text-left border border-bone/15 bg-ink/30 p-5 overflow-hidden hover:border-electric transition-colors group"
            >
              <div className="opacity-45 grayscale group-hover:opacity-70 transition-opacity pointer-events-none select-none">
                <p className="font-display uppercase tracking-wider text-bone">{t.name}</p>
                <p className="text-sm text-bone/60 mt-2 leading-relaxed">{t.desc}</p>
                <div className="mt-4 h-16 border border-bone/10 bg-ink/40" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-[1px] group-hover:bg-ink/20 transition-colors">
                <span className="flex items-center gap-2 font-display uppercase tracking-wider text-xs text-electric border border-electric/50 px-3 py-1.5 bg-ink/70">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Preview demo
                </span>
              </div>
            </button>
          ))}
        </div>

        <a
          href="/login"
          className="mt-8 inline-block border-2 border-electric text-electric px-8 py-4 font-display uppercase tracking-wider hover:bg-electric hover:text-ink transition-colors"
        >
          Unlock the full toolkit — free →
        </a>
      </div>

      {/* Read-only tool demo modal */}
      {demo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-6" onClick={() => setDemo(null)}>
          <div className="w-full max-w-md border-2 border-electric bg-ink p-7 text-bone" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <p className="glow font-display uppercase text-2xl font-700 leading-tight text-electric">{demo.name}</p>
              <button onClick={() => setDemo(null)} className="text-bone/50 hover:text-electric text-xl leading-none">✕</button>
            </div>
            <p className="mt-2 text-bone/70 text-sm leading-relaxed">{demo.desc}</p>
            <p className="mt-5 text-[10px] uppercase tracking-wider text-bone/40">Read-only preview</p>
            <div className="mt-2 border border-bone/15 bg-ink/40 divide-y divide-bone/10">
              {demo.rows.map((r, i) => (
                <div key={i} className="px-4 py-2.5 text-sm text-bone/85 font-display tracking-wide">{r}</div>
              ))}
            </div>
            <a href="/login" className="mt-6 block text-center bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors">
              Create a free account to use it →
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
