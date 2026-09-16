"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const OneRepMaxCalculator = dynamic(() => import("./tools/OneRepMaxCalculator"));
const WilksDotsCalculator = dynamic(() => import("./tools/WilksDotsCalculator"));
const PRTracker = dynamic(() => import("./tools/PRTracker"));
const MacroCalculator = dynamic(() => import("./tools/MacroCalculator"));

// Public free tools. The Workout Log has been moved to the Client Portal
// (/clients) and the Tensor Strength app — it's for active clients only.
// The Macro Calculator is free for everyone, right here.
const tabs = [
  { id: "1rm", label: "1-Rep Max" },
  { id: "wilks", label: "Wilks & DOTS" },
  { id: "pr", label: "PR Tracker" },
  { id: "macros", label: "Macro Calculator" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function Tools() {
  const [active, setActive] = useState<TabId>("1rm");

  // Let the navbar's Free Tools dropdown deep-link to a specific calculator
  // via /?t=wilks#tools etc.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (t === "1rm" || t === "wilks" || t === "pr" || t === "macros") setActive(t);
  }, []);

  return (
    <section id="tools" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-12">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Free Tools
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Train smarter.
            <br />
            <span className="text-electric">Track the work.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            Four free calculators to estimate your maxes, score your lifts, chase down
            PRs, and dial in your daily macros — free with your account, saved and synced across your devices.
          </p>
        </div>

        {/* Members get more callout */}
        <div className="mb-10 border-2 border-electric bg-electric/10 p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="glow font-display uppercase tracking-wider text-electric text-sm mb-2">
              ⚡ Members get the full system
            </p>
            <p className="text-bone/80 text-sm leading-relaxed">
              These calculators are free. The complete toolkit lives in the Client Portal —
              the full workout log, macro tracker, exercise and warmup libraries, weekly
              programs, and weekly check-ins with Hutch.
            </p>
          </div>
          <a
            href="/#pricing"
            className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors whitespace-nowrap"
          >
            See Pricing →
          </a>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10 border-b border-bone/15 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={
                "px-5 py-3 font-display uppercase tracking-wider text-sm transition-colors " +
                (active === t.id
                  ? "bg-electric text-ink"
                  : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-ink/20 border border-bone/10 p-6 md:p-10">
          {active === "1rm" && <OneRepMaxCalculator />}
          {active === "wilks" && <WilksDotsCalculator />}
          {active === "pr" && <PRTracker />}
          {active === "macros" && <MacroCalculator />}
        </div>

        {/* Locked Pro features tease */}
        <div className="mt-8">
          <p className="font-display uppercase tracking-[0.3em] text-bone/50 text-xs mb-4">
            🔒 Unlock with a membership
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { t: "Cloud sync", d: "Every device, always saved" },
              { t: "Full workout log", d: "Log sets, track PRs & trends" },
              { t: "Full programs", d: "The Hutch Touch performance rotation + PDF" },
              { t: "Coach check-ins", d: "Weekly feedback from Hutch" },
            ].map((f) => (
              <a
                key={f.t}
                href="/#pricing"
                className="group relative border border-bone/15 bg-ink/40 p-4 flex flex-col hover:border-electric transition-colors"
              >
                <span className="absolute top-3 right-3 text-bone/30 group-hover:text-electric transition-colors text-sm">
                  🔒
                </span>
                <span className="font-display uppercase tracking-wider text-sm text-bone group-hover:text-electric transition-colors pr-6">
                  {f.t}
                </span>
                <span className="text-xs text-bone/50 mt-1 leading-snug">{f.d}</span>
                <span className="mt-3 font-display uppercase tracking-wider text-[10px] text-electric">
                  Members only →
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
