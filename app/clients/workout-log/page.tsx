"use client";

import { useEffect, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";
import WorkoutLog from "../../../src/components/tools/WorkoutLog";
import ExerciseLibrary from "../../../src/components/ExerciseLibrary";
import WarmupLibrary from "../../../src/components/WarmupLibrary";
import TrainerPrograms from "../../../src/components/portal/TrainerPrograms";
import ClientExtras from "../../../src/components/tools/ClientExtras";
import HutchTouch from "../../../src/components/HutchTouch";

type Tab = "tracker" | "exercises" | "warmups" | "extras" | "hutch" | "build";

export default function WorkoutLogPage() {
  const [userId, setUserId] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessType, setAccessType] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [tab, setTab] = useState<Tab>("tracker");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "exercises") setTab("exercises");
      setExerciseSearch(params.get("search") || "");
      const { user } = await me.json();
      if (!user.portalAccess && !user.isTrainer) {
        window.location.href = "/clients";
        return;
      }
      setUserId(user.id);
      setAccessType(user.accessType || "");
      setIsTrainer(!!user.isTrainer || user.role === "admin");
      setIsAdmin(user.role === "admin");
      setAuthorized(true);
      setLoading(false);
    })().catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "tracker", label: "Workout Tracker" },
    { id: "exercises", label: "Exercise Library" },
    { id: "warmups", label: "Warmups & Conditioning" },
    { id: "extras", label: "Tools" },
    { id: "hutch", label: "The Hutch Touch" },
    ...(isTrainer ? [{ id: "build" as Tab, label: "Build for Clients" }] : []),
  ];

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />

      <div className="ts-mobile-page mx-auto max-w-6xl px-6 py-8 sm:py-10 md:py-14">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
          Client Tools
        </p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          Train <span className="text-electric">smart.</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-2xl">
          Your workout tracker, exercise library and warm-up routines — all in
          one place. Everything you log syncs to your account, so it&apos;s there on any device.
        </p>

        {loadError ? (<div role="alert" className="mt-8 border border-rose-400/40 p-5">Could not load your account.
          <button onClick={() => window.location.reload()} className="ml-3 text-electric underline">Try again</button></div>) : loading || !authorized ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">
            Loading…
          </p>
        ) : (
          <>
            <div className="ts-mobile-tabs mt-7 sm:mt-8 mb-5 sm:mb-6 border-b border-bone/15">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    "px-4 sm:px-5 py-3 font-display uppercase tracking-wider text-xs sm:text-sm transition-colors " +
                    (tab === t.id
                      ? "bg-electric text-ink"
                      : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "build" ? (
              <div>
                <div className="mb-6 border-l-2 border-electric/50 pl-4">
                  <p className="font-display uppercase tracking-wider text-electric text-sm">
                    Coach tools
                  </p>
                  <p className="text-bone/60 text-sm mt-1 leading-relaxed max-w-2xl">
                    Build a custom workout and send it to a client (or all your
                    clients). It appears in their portal with a{" "}
                    <span className="text-electric">Load into Tracker</span>{" "}
                    button that drops it straight into this tracker.
                  </p>
                </div>
                <TrainerPrograms />
              </div>
            ) : tab === "hutch" ? (
              <HutchTouch mode="portal" isAdmin={isAdmin} />
            ) : (
              <div className="bg-ink/20 border border-bone/10 p-3 sm:p-6 md:p-10">
                {tab === "tracker" && <WorkoutLog userId={userId} accessType={accessType} />}
                {tab === "exercises" && <ExerciseLibrary initialQuery={exerciseSearch} />}
                {tab === "warmups" && <WarmupLibrary />}
                {tab === "extras" && <ClientExtras />}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
