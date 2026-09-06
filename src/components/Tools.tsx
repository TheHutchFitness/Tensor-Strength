"use client";

import { useEffect, useState } from "react";
import OneRepMaxCalculator from "./tools/OneRepMaxCalculator";
import WilksDotsCalculator from "./tools/WilksDotsCalculator";
import PRTracker from "./tools/PRTracker";
import NearbyGyms from "./NearbyGyms";

// Public free tools. The Workout Log and Macro (nutrition) tracker have been
// moved to the Client Portal (/clients) and the Tensor Strength app — they're
// for active clients only.
const tabs = [
  { id: "1rm", label: "1-Rep Max" },
  { id: "wilks", label: "Wilks & DOTS" },
  { id: "pr", label: "PR Tracker" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function Tools() {
  const [active, setActive] = useState<TabId>("1rm");

  // Let the navbar's Free Tools dropdown deep-link to a specific calculator
  // via /?t=wilks#tools etc.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (t === "1rm" || t === "wilks" || t === "pr") setActive(t);
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
            Three free calculators to estimate your maxes, score your lifts, and chase down
            PRs. No login — everything saves right on your device.
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
        </div>

        <NearbyGyms />
      </div>
    </section>
  );
}
