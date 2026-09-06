"use client";

import { useEffect, useState } from "react";
import PortalHeader from "@/components/portal/PortalHeader";
import NutritionTracker from "@/components/tools/NutritionTracker";
import NutritionExtras from "@/components/tools/NutritionExtras";

export default function NutritionPage() {
  const [loading, setLoading] = useState(true);
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
    })();
  }, []);

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />

      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
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

        {loading || !authorized ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">
            Loading…
          </p>
        ) : (
          <div className="mt-10">
            <div className="flex gap-2 mb-8">
              {(["tracker", "tools"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={"px-5 py-2.5 font-display uppercase tracking-wider text-sm transition-colors " + (view === v ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:text-electric")}>
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
