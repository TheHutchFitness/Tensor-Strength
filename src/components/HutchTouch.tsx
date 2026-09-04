"use client";

import { useMemo, useState } from "react";
import {
  hutchTouchSessions,
  HUTCH_TOUCH_PRIMARIES,
  HUTCH_TOUCH_BASELINES,
  HUTCH_TOUCH_PDF_URL,
  HUTCH_TOUCH_TRACKER_URL,
  type HutchTouchDay,
} from "@/data/hutchTouchProgram";

type Mode = "portal" | "public";

const DAYS: HutchTouchDay[] = ["Push", "Pull", "Legs"];

export default function HutchTouch({ mode }: { mode: Mode }) {
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState<HutchTouchDay>("Push");

  const session = useMemo(
    () => hutchTouchSessions.find((s) => s.week === week && s.day === day),
    [week, day]
  );

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
            The 8-week
            <br />
            <span className="text-electric">performance block.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            A complete Push / Pull / Legs block engineered around three primary lifts —
            Larson Press, Sumo Deadlift, and HBT Front Squat — with power work, accessories,
            and conditioning built into every session. Eight weeks of progressive, programmed
            training.
            {isPublic
              ? " Members get every session, set, and target load in the Client Portal."
              : " Pick a week and day below to see the full session."}
          </p>

          {/* From Hutch — personal endorsement, visible to everyone */}
          <div className="mt-6 border-2 border-electric bg-electric/10 p-5 md:p-6">
            <p className="glow font-display uppercase tracking-wider text-electric text-sm mb-3">
              From Hutch — this is the program I run myself
            </p>
            <p className="text-bone/85 leading-relaxed text-sm md:text-base">
              This isn&apos;t a template I sketched out for other people. It&apos;s the exact
              program I use to train — the one I&apos;ve built and refined over years to
              develop long-term strength, stability, endurance, and real athletic ability.
              Every session is structured the way I structure my own: power work first,
              primary strength lifts second, then the accessory and conditioning work that
              keeps me moving well and performing — not just lifting big.
            </p>
            <p className="text-bone/85 leading-relaxed text-sm md:text-base mt-3">
              The same block that took my Larson Press to 255 for 5×3, my Sumo Deadlift to
              500 for 2×3, and my HBT Front Squat to 330 for 3×3. It&apos;s what I run when
              I want to get stronger, stay durable, and keep the athletic edge — and it&apos;s
              what my clients run when they want the same.
            </p>
            <p className="font-display uppercase tracking-wider text-xs text-bone/60 mt-4">
              — Hutch, Founder · Tensor Strength
            </p>
          </div>

          {/* Baselines */}
          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            {Object.entries(HUTCH_TOUCH_BASELINES).map(([lift, baseline]) => (
              <div key={lift} className="border border-bone/15 bg-ink/30 p-3">
                <p className="font-display uppercase tracking-wider text-[10px] text-electric">
                  {lift}
                </p>
                <p className="text-xs text-bone/70 mt-1 leading-relaxed">{baseline}</p>
              </div>
            ))}
          </div>

          {/* Downloads */}
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={HUTCH_TOUCH_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-electric text-electric px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-electric hover:text-ink transition-colors"
            >
              Download Program PDF →
            </a>
            <a
              href={HUTCH_TOUCH_TRACKER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-bone/30 text-bone/80 px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:border-bone hover:text-bone transition-colors"
            >
              Download Tracker (Excel) →
            </a>
          </div>
        </div>

        {/* Week + day selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display uppercase tracking-wider text-xs text-bone/50">Week</span>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={
                  "w-9 h-9 font-display text-sm transition-colors " +
                  (week === w
                    ? "bg-electric text-ink"
                    : "border border-bone/20 text-bone/60 hover:border-electric hover:text-electric")
                }
              >
                {w}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={
                  "px-4 py-2 font-display uppercase tracking-wider text-sm transition-colors " +
                  (day === d
                    ? "bg-electric text-ink"
                    : "border border-bone/20 text-bone/60 hover:border-electric hover:text-electric")
                }
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Session */}
        {session ? (
          <div className="border-2 border-electric/50 bg-ink/30 backdrop-blur-sm">
            <div className="px-5 py-4 border-b border-bone/15 flex items-center justify-between gap-4 flex-wrap">
              <p className="font-display uppercase tracking-wider text-bone">
                Week {week} — {day}
              </p>
              <p className="font-display uppercase tracking-wider text-[10px] text-electric">
                Primary: {HUTCH_TOUCH_PRIMARIES[day]}
              </p>
            </div>

            {isPublic ? (
              // Public: teaser — first 3 exercises only
              <div className="p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-bone/50 text-[10px] uppercase tracking-wider">
                      <th className="text-left pb-2 font-display">#</th>
                      <th className="text-left pb-2 font-display">Exercise</th>
                      <th className="text-left pb-2 font-display hidden sm:table-cell">Sets</th>
                      <th className="text-left pb-2 font-display hidden sm:table-cell">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.exercises.slice(0, 3).map((ex) => (
                      <tr key={ex.order} className="border-t border-bone/10">
                        <td className="py-2 text-bone/50 font-display">{ex.order}</td>
                        <td className="py-2 text-bone/90">{ex.exercise}</td>
                        <td className="py-2 text-bone/70 font-display hidden sm:table-cell">{ex.sets}</td>
                        <td className="py-2 text-bone/60 text-xs hidden sm:table-cell">{ex.load}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-bone/10">
                      <td colSpan={4} className="py-4 text-center">
                        <p className="text-bone/50 text-sm mb-3">
                          + {session.exercises.length - 3} more exercises in this session
                                        ({HUTCH_TOUCH_PRIMARIES[day]}, accessories, conditioning…)
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
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-bone/50 text-[10px] uppercase tracking-wider">
                      <th className="text-left pb-2 font-display">#</th>
                      <th className="text-left pb-2 font-display">Exercise</th>
                      <th className="text-left pb-2 font-display">Sets</th>
                      <th className="text-left pb-2 font-display">Target / Load</th>
                      <th className="text-left pb-2 font-display">Purpose / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.exercises.map((ex) => (
                      <tr key={ex.order} className="border-t border-bone/10">
                        <td className="py-2 text-bone/50 font-display align-top">{ex.order}</td>
                        <td className="py-2 text-bone/90 align-top">{ex.exercise}</td>
                        <td className="py-2 text-bone/70 font-display align-top">{ex.sets}</td>
                        <td className="py-2 text-bone/70 text-xs align-top">{ex.load}</td>
                        <td className="py-2 text-bone/50 text-xs align-top">{ex.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-5 border-t border-bone/15 pt-4 text-xs text-bone/50 leading-relaxed">
                  <p>
                    <span className="text-electric font-display uppercase tracking-wider">How to read:</span>{" "}
                    Loads on the three primary lifts use your current numbers as references;
                    secondary and accessory work is progressed by RPE, rep quality, and technical
                    failure. <span className="text-bone/70">Technical failure</span> = stop when the
                    next rep would break your standard. <span className="text-bone/70">AMRAP</span>{" "}
                    accessories go to technical failure unless noted.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-bone/50 font-display uppercase tracking-wider text-sm">
            No session found.
          </p>
        )}
      </div>
    </section>
  );
}
