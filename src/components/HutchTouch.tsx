"use client";

import { useState } from "react";
import {
  hutchTouchSessions,
  HUTCH_TOUCH_PERFORMANCE_PDF_URL,
  HUTCH_TOUCH_ATHLETE_PDF_URL,
  HUTCH_TOUCH_BENCH_PROGRESSION,
  HUTCH_TOUCH_SQUAT_ROTATION,
  HUTCH_TOUCH_DEADLIFT_ROTATION,
  type HutchTouchSessionId,
} from "../data/hutchTouchProgram";

type Mode = "portal" | "public";

export default function HutchTouch({ mode, isAdmin = false }: { mode: Mode; isAdmin?: boolean }) {
  const [active, setActive] = useState<HutchTouchSessionId>("push");

  const session = hutchTouchSessions.find((s) => s.id === active) ?? hutchTouchSessions[0];
  const isPublic = mode === "public";

  return (
    <section id={isPublic ? "hutch-touch" : undefined} className={isPublic ? "py-24 md:py-32 relative overflow-hidden" : ""}>
      {isPublic && <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />}
      <div className={isPublic ? "relative mx-auto max-w-6xl px-6" : ""}>
        <div className="max-w-2xl mb-10">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            The Hutch Touch
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            The performance
            <br />
            <span className="text-electric">rotation.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            A complete strength &amp; athleticism system built as a four-session rotation —
            Upper Push, Lower Pull, Upper Pull, and Legs — engineered around three primary
            lifts: bench, squat, and sumo deadlift. There&apos;s no fixed weekly calendar:
            you run the next session when recovery and movement quality support it. Overload
            comes from <span className="text-bone/90">variation progression</span> on the main
            lifts plus honest RPE loading — not just piling on weight.
            {isPublic
              ? " Members get every session, variation progression, and target load in the Client Portal."
              : " Pick a session below to see the full workout, then load it straight into your tracker."}
          </p>

          {/* Two editions — make the distinction obvious */}
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <div className="border border-bone/20 bg-ink/30 p-4">
              <p className="font-display uppercase tracking-wider text-xs text-electric">
                Performance Edition
              </p>
              <p className="text-sm text-bone/70 mt-1 leading-relaxed">
                The public program for every serious lifter and athlete — structured,
                prescriptive, with clear recovery rules. This is the one you run.
              </p>
            </div>
            <div className="border border-bone/20 bg-ink/30 p-4">
              <p className="font-display uppercase tracking-wider text-xs text-bone/60">
                Athlete Edition
              </p>
              <p className="text-sm text-bone/70 mt-1 leading-relaxed">
                Hutch&apos;s personal, advanced version — autoregulated and built for
                athletes who self-manage load and fatigue. Kept private to Hutch.
              </p>
            </div>
          </div>

          {/* From Hutch — personal endorsement, visible to everyone */}
          <div className="mt-6 border-2 border-electric bg-electric/10 p-5 md:p-6">
            <p className="glow font-display uppercase tracking-wider text-electric text-sm mb-3">
              From Hutch — this is the program I run myself
            </p>
            <p className="text-bone/85 leading-relaxed text-sm md:text-base">
              This isn&apos;t a template I sketched out for other people. The Performance
              Edition is the exact system I use to train, written so anyone serious can run
              it: master control, own unstable positions, build strength, express power, then
              bring it all back to the primary lift. Power and quality work first, primary
              strength lift second, then the accessory and conditioning work that keeps me
              moving well and performing — not just lifting big.
            </p>
            <p className="font-display uppercase tracking-wider text-xs text-bone/60 mt-4">
              — Hutch, Founder · Tensor Strength
            </p>
          </div>

          {/* Downloads */}
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={HUTCH_TOUCH_PERFORMANCE_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-electric text-electric px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-electric hover:text-ink transition-colors"
            >
              Download Performance Edition (PDF) →
            </a>
            {isAdmin && (
              <a
                href={HUTCH_TOUCH_ATHLETE_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-bone/40 text-bone/80 px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:border-bone hover:text-bone transition-colors"
              >
                Download Athlete Edition — Hutch only (PDF) →
              </a>
            )}
          </div>
          {isAdmin && (
            <p className="mt-2 text-[10px] uppercase tracking-wider text-bone/40">
              The Athlete Edition link is only visible to you.
            </p>
          )}
        </div>

        {/* Session selector */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="font-display uppercase tracking-wider text-xs text-bone/50 mr-1">Session</span>
          {hutchTouchSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={
                "px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
                (active === s.id
                  ? "bg-electric text-ink"
                  : "border border-bone/20 text-bone/60 hover:border-electric hover:text-electric")
              }
            >
              {s.number}. {s.title}
            </button>
          ))}
        </div>

        {/* Session */}
        <div className="border-2 border-electric/50 bg-ink/30 backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-bone/15 flex items-center justify-between gap-4 flex-wrap">
            <p className="font-display uppercase tracking-wider text-bone">
              Session {session.number} — {session.title}
            </p>
            <p className="font-display uppercase tracking-wider text-[10px] text-electric">
              Primary: {session.focus}
            </p>
          </div>

          {isPublic ? (
            // Public: teaser — first 3 work exercises only
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-bone/50 text-[10px] uppercase tracking-wider">
                    <th className="text-left pb-2 font-display">#</th>
                    <th className="text-left pb-2 font-display">Exercise</th>
                    <th className="text-left pb-2 font-display hidden sm:table-cell">Sets × Reps</th>
                    <th className="text-left pb-2 font-display hidden sm:table-cell">RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {session.exercises.slice(0, 3).map((ex) => (
                    <tr key={ex.order} className="border-t border-bone/10">
                      <td className="py-2 text-bone/50 font-display">{ex.order}</td>
                      <td className="py-2 text-bone/90">{ex.exercise}</td>
                      <td className="py-2 text-bone/70 font-display hidden sm:table-cell">{ex.sets} × {ex.reps}</td>
                      <td className="py-2 text-bone/60 text-xs hidden sm:table-cell">{ex.rpe}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-bone/10">
                    <td colSpan={4} className="py-4 text-center">
                      <p className="text-bone/50 text-sm mb-3">
                        + {session.exercises.length - 3} more exercises, the full warm-up, and the
                        bench/squat/deadlift variation progressions
                      </p>
                      <a
                        href="/#pricing"
                        className="inline-flex bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors"
                      >
                        Unlock the full program →
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            // Portal: full session
            <div className="p-5">
              {/* Warm-up */}
              <div className="mb-5">
                <p className="font-display uppercase tracking-wider text-[10px] text-electric mb-2">
                  Warm-up order
                </p>
                <div className="flex flex-wrap gap-2">
                  {session.warmup.map((w, i) => (
                    <span key={i} className="text-xs text-bone/70 border border-bone/15 bg-ink/40 px-2.5 py-1">
                      {i + 1}. {w}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mobile: stacked cards */}
              <div className="sm:hidden grid gap-3">
                {session.exercises.map((ex) => (
                  <div key={ex.order} className="border border-bone/10 bg-ink/30 rounded-md p-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-bone/40 font-display text-xs">#{ex.order}</span>
                      <span className="text-bone/90 font-medium">{ex.exercise}</span>
                    </div>
                    <dl className="mt-2 grid grid-cols-[84px_1fr] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-bone/40 font-display uppercase tracking-wider">Sets</dt>
                      <dd className="text-bone/70 font-display">{ex.sets} × {ex.reps}</dd>
                      <dt className="text-bone/40 font-display uppercase tracking-wider">RPE</dt>
                      <dd className="text-bone/70">{ex.rpe}</dd>
                      {ex.notes ? (
                        <>
                          <dt className="text-bone/40 font-display uppercase tracking-wider">Notes</dt>
                          <dd className="text-bone/60">{ex.notes}</dd>
                        </>
                      ) : null}
                    </dl>
                  </div>
                ))}
              </div>

              {/* Tablet / desktop: full table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-bone/50 text-[10px] uppercase tracking-wider">
                      <th className="text-left pb-2 font-display">#</th>
                      <th className="text-left pb-2 font-display">Exercise</th>
                      <th className="text-left pb-2 font-display">Sets</th>
                      <th className="text-left pb-2 font-display">Reps</th>
                      <th className="text-left pb-2 font-display">RPE</th>
                      <th className="text-left pb-2 font-display">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.exercises.map((ex) => (
                      <tr key={ex.order} className="border-t border-bone/10">
                        <td className="py-2 text-bone/50 font-display align-top">{ex.order}</td>
                        <td className="py-2 text-bone/90 align-top">{ex.exercise}</td>
                        <td className="py-2 text-bone/70 font-display align-top">{ex.sets}</td>
                        <td className="py-2 text-bone/70 font-display align-top">{ex.reps}</td>
                        <td className="py-2 text-bone/70 text-xs align-top">{ex.rpe}</td>
                        <td className="py-2 text-bone/50 text-xs align-top">{ex.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 border-t border-bone/15 pt-4 text-xs text-bone/50 leading-relaxed">
                <p>
                  <span className="text-electric font-display uppercase tracking-wider">How to read:</span>{" "}
                  Load by honest RPE, not fixed numbers. The main lift changes through a planned
                  variation progression (below) — recalibrate load every time the variation changes.
                  Accessories are pushed by rep quality and technical failure, not by grinding reps.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Variation progressions — portal only */}
        {!isPublic && (
          <div className="mt-8 grid lg:grid-cols-3 gap-4">
            <ProgressionCard title="Bench progression" steps={HUTCH_TOUCH_BENCH_PROGRESSION} />
            <ProgressionCard title="Squat rotation" steps={HUTCH_TOUCH_SQUAT_ROTATION} />
            <ProgressionCard title="Deadlift / hinge rotation" steps={HUTCH_TOUCH_DEADLIFT_ROTATION} />
          </div>
        )}
      </div>
    </section>
  );
}

function ProgressionCard({
  title,
  steps,
}: {
  title: string;
  steps: { variation: string; purpose: string; detail: string }[];
}) {
  return (
    <div className="border border-bone/15 bg-ink/30 p-5">
      <p className="font-display uppercase tracking-wider text-electric text-sm mb-3">{title}</p>
      <ol className="grid gap-2.5">
        {steps.map((s, i) => (
          <li key={i} className="border-l-2 border-electric/40 pl-3">
            <p className="text-sm text-bone/90">
              <span className="text-bone/40 font-display">{i + 1}.</span> {s.variation}
            </p>
            <p className="text-[11px] text-bone/50 leading-relaxed">{s.purpose} · {s.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
