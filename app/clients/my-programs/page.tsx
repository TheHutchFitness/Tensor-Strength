"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SiteTabBar from "@/components/SiteTabBar";
import { memberPrograms } from "@/data/memberPrograms";

export default function MyProgramsPage() {
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) { window.location.href = "/login?from=/clients/my-programs"; return; }
      const { user } = await me.json();
      if (!user.portalAccess && !user.isTrainer) { window.location.href = "/clients"; return; }
      setOk(true);
      setLoading(false);
    })();
  }, []);

  if (loading || !ok) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-ink pt-28 text-center text-bone/60">Loading your programs…</main>
        <SiteTabBar />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ink text-bone pb-28">
        <section className="mx-auto max-w-5xl px-5 pt-28">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs">Member Library</p>
          <h1 className="font-display uppercase text-4xl md:text-5xl leading-tight mt-2">My Programs</h1>
          <p className="mt-3 text-bone/70 max-w-2xl">Every training block you can run, in one place. Open any program to load its sessions straight into your workout tracker.</p>

          {/* Signature */}
          <div className="mt-8 border-2 border-electric/50 bg-electric/5 p-6">
            <p className="font-display uppercase tracking-wider text-electric text-xs">Signature</p>
            <h2 className="font-display uppercase text-2xl mt-1">The Hutch Touch</h2>
            <p className="text-sm text-bone/70 mt-2 max-w-2xl">Hutch's real 4-session performance rotation — bench, squat & sumo deadlift with variation progression. Readiness check, variation auto-advance and last-time weights built in.</p>
            <a href="/clients/workout-log" className="inline-block mt-4 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors">Open in tracker →</a>
          </div>

          {/* Member programs */}
          <h2 className="font-display uppercase text-2xl mt-10 mb-4">More Programs</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {memberPrograms.map((p) => (
              <div key={p.id} className="border border-bone/15 bg-ink/30 p-5 flex flex-col">
                <p className="font-display uppercase tracking-wider text-lg text-bone">{p.name}</p>
                <p className="text-[11px] uppercase tracking-wider text-electric mt-0.5">{p.length}{p.deloadable ? " · deload option" : ""}</p>
                <p className="text-sm text-bone/65 mt-2 flex-1 leading-relaxed">{p.blurb}</p>
                <p className="text-[11px] text-bone/40 mt-2">{p.sessions.length} sessions</p>
                <a href={`/clients/workout-log?program=${p.id}#member-programs`} className="inline-block mt-4 border-2 border-electric text-electric px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-electric hover:text-ink transition-colors text-center">
                  Open in tracker →
                </a>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
