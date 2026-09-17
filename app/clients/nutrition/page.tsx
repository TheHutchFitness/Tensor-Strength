"use client";

import { useEffect, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";
import NutritionTracker from "../../../src/components/tools/NutritionTracker";
import NutritionExtras from "../../../src/components/tools/NutritionExtras";

export default function NutritionPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [view, setView] = useState<"tracker" | "tools">("tracker");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        window.location.href = "/login?from=/clients/nutrition";
        return;
      }
      const { user } = await me.json();
      if (!user.portalAccess && !user.isTrainer) {
        window.location.href = "/clients";
        return;
      }
      setAuthorized(true);
      setLoading(false);
    })().catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  }, []);

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />

      <div className="ts-mobile-page mx-auto max-w-6xl px-6 py-8 sm:py-10 md:py-14">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
          Client Tools
        </p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          Nutrition <span className="text-electric">tracker.</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-2xl">
          Log your food, hit your macros and stay on target — set your daily
          calorie and macro goals, then add meals throughout the day.
        </p>

        {loadError ? (
          <div role="alert" className="mt-10 border border-rose-400/40 p-5 text-bone/80">
            We couldn&apos;t load your nutrition tracker.
            <button onClick={() => window.location.reload()} className="ml-3 text-electric underline">
              Try again
            </button>
          </div>
        ) : loading || !authorized ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">
            Loading…
          </p>
        ) : (
          <div className="mt-10">
            <div className="ts-mobile-tabs mb-6 sm:mb-8 border-b border-bone/15">
              {(["tracker", "tools"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={"px-4 sm:px-5 py-2.5 font-display uppercase tracking-wider text-xs sm:text-sm transition-colors " + (view === v ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:text-electric")}>
                  {v === "tracker" ? "Tracker" : "Nutrition Tools"}
                </button>
              ))}
            </div>
            {view === "tracker" ? <NutritionTracker /> : <NutritionExtras />}
          </div>
        )}
      </div>
    </main>
  );
}
