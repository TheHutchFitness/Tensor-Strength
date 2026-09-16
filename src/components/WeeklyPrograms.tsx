"use client";

import { useState } from "react";
import { weeklyPrograms, type WeeklyProgram } from "../data/weeklyPrograms";

type Mode = "portal" | "public";

// The free starter programs — static, always available to everyone (no weekly rotation).
const FREE_STARTERS = [
  { file: "01_tensor_athletic_performance.pdf", title: "Athletic Performance", tag: "Power & Speed", desc: "Jumps, sprints, and heavy compound work to build explosiveness and make you a better athlete." },
  { file: "02_tensor_strength_focus.pdf", title: "Strength Focus", tag: "Get Strong", desc: "Squat, bench, deadlift, and press built around progressive overload for raw, usable strength." },
  { file: "03_tensor_general_health.pdf", title: "General Health", tag: "Start Here", desc: "Balanced full-body training for energy, longevity, and staying capable — ideal if you're new." },
  { file: "04_tensor_hypertrophy.pdf", title: "Hypertrophy", tag: "Build Muscle", desc: "Higher-volume training that targets every muscle group for size and definition." },
  { file: "05_tensor_home_minimal_equipment.pdf", title: "Home / Minimal Equipment", tag: "Small Setup", desc: "A full week you can run with just dumbbells or a few basics — no commercial gym required." },
  { file: "06_tensor_anywhere_bodyweight.pdf", title: "Anywhere / Bodyweight", tag: "Zero Gear", desc: "Train anywhere — hotel, park, living room — using nothing but your bodyweight." },
];

function parseDate(s: string) {
  // Treat as local midnight on that date
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function statusOf(p: WeeklyProgram, now: Date): "active" | "upcoming" | "archived" {
  const from = parseDate(p.activeFrom);
  const until = parseDate(p.activeUntil);
  // until is inclusive — end of that day
  const end = new Date(until);
  end.setDate(end.getDate() + 1);
  if (now < from) return "upcoming";
  if (now >= from && now < end) return "active";
  return "archived";
}

function fmtRange(from: string, until: string) {
  const f = parseDate(from);
  const u = parseDate(until);
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${f.toLocaleDateString("en-US", opt)} – ${u.toLocaleDateString("en-US", opt)}`;
}

function StatusBadge({ status }: { status: "active" | "upcoming" | "archived" }) {
  const map = {
    active: { label: "● Active now", cls: "bg-electric text-ink" },
    upcoming: { label: "○ Upcoming", cls: "bg-transparent text-bone/70 border border-bone/30" },
    archived: { label: "✕ Archived", cls: "bg-transparent text-bone/40 border border-bone/20" },
  } as const;
  const s = map[status];
  return (
    <span className={"font-display uppercase tracking-wider text-[10px] px-2 py-1 " + s.cls}>
      {s.label}
    </span>
  );
}

function ProgramCard({ p, mode }: { p: WeeklyProgram; mode: Mode }) {
  const [open, setOpen] = useState(false);
  // Use a stable "today" at render
  const now = new Date();
  const status = statusOf(p, now);
  const locked = status === "archived" || status === "upcoming";

  return (
    <div
      className={
        "border bg-ink/30 backdrop-blur-sm transition-colors " +
        (status === "active"
          ? "border-electric/60 hover:border-electric"
          : "border-bone/15")
      }
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-display uppercase tracking-wider text-[10px] text-electric border border-electric/40 px-2 py-0.5">
                {p.purposeTag}
              </span>
              {p.free && (
                <span className="font-display uppercase tracking-wider text-[10px] bg-bone text-ink px-2 py-0.5">
                  Free
                </span>
              )}
              <span className="font-display uppercase tracking-wider text-[10px] text-bone/50">
                {p.weekLabel}
              </span>
            </div>
            <p className="font-display uppercase tracking-wider text-bone leading-tight">
              {p.title}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <p className="text-sm text-bone/70 mt-3 leading-relaxed">{p.description}</p>

        <div className="mt-3 flex items-center gap-4 text-[11px] text-bone/50 flex-wrap">
          <span className="font-display uppercase tracking-wider">
            {fmtRange(p.activeFrom, p.activeUntil)}
          </span>
          {p.days && (
            <span>{p.days.length} training days</span>
          )}
        </div>

        {/* Portal: full content; Public: free programs open, members-only are teased */}
        {mode === "portal" || p.free ? (
          <>
            {p.pdfUrl ? (
              <a
                href={p.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "mt-5 inline-flex font-display uppercase tracking-wider text-sm " +
                  (locked
                    ? "text-bone/40 pointer-events-none"
                    : "text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors")
                }
              >
                {locked ? "Archived — link closed" : "Open Program PDF →"}
              </a>
            ) : p.days ? (
              <div className="mt-5">
                <button
                  onClick={() => !locked && setOpen((v) => !v)}
                  disabled={locked}
                  className={
                    "font-display uppercase tracking-wider text-sm transition-colors " +
                    (locked
                      ? "text-bone/40 cursor-not-allowed"
                      : "text-electric border-b border-electric hover:text-bone hover:border-bone")
                  }
                >
                  {locked
                    ? status === "upcoming"
                      ? "Locked — unlocks " + parseDate(p.activeFrom).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Archived — access closed"
                    : open
                    ? "Hide sessions ↑"
                    : "View sessions ↓"}
                </button>
                {open && !locked && (
                  <div className="mt-5 grid gap-4">
                    {p.days.map((d) => (
                      <div key={d.day} className="border border-bone/10 bg-ink/40 p-4">
                        <p className="font-display uppercase tracking-wider text-sm text-electric">
                          {d.day} <span className="text-bone/40">·</span>{" "}
                          <span className="text-bone/80">{d.focus}</span>
                        </p>
                        <table className="w-full text-sm mt-3">
                          <thead>
                            <tr className="text-bone/50 text-[10px] uppercase tracking-wider">
                              <th className="text-left pb-1 font-display">Exercise</th>
                              <th className="text-center pb-1 font-display">Sets</th>
                              <th className="text-center pb-1 font-display">Reps</th>
                              <th className="text-left pb-1 font-display pl-3">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {d.exercises.map((ex, i) => (
                              <tr key={i} className="border-t border-bone/10">
                                <td className="py-2 text-bone/90">{ex.name}</td>
                                <td className="py-2 text-center text-bone/80 font-display">{ex.sets}</td>
                                <td className="py-2 text-center text-bone/80 font-display">{ex.reps}</td>
                                <td className="py-2 pl-3 text-bone/50 text-xs">{ex.notes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : (
          // Public teaser for members-only programs: no sessions shown
          <p className="mt-5 text-xs text-bone/50 leading-relaxed">
            {status === "active"
              ? "Available now for members — apply for coaching to get access."
              : status === "upcoming"
              ? "Drops for members next week."
              : "Member access has closed for this week."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function WeeklyPrograms({ mode, single }: { mode: Mode; single?: boolean }) {
  const isPublic = mode === "public";

  // ---- PUBLIC: static free starter library (always accessible, no weekly rotation) ----
  if (isPublic) {
    return (
      <section id="programs" className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mb-10">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
              Free Programs
            </p>
            <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
              Six free
              <br />
              starter <span className="text-electric">programs.</span>
            </h2>
            <p className="mt-6 text-bone/70 leading-relaxed">
              Six complete training programs — free, always here, and available 24/7 with
              no account needed. Pick the one that matches your goal and your setup, download
              the PDF, and get to work. Members get the full Hutch Touch performance
              rotation, the full workout log, libraries, and check-ins in the portal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FREE_STARTERS.map((p) => (
              <a
                key={p.file}
                href={`/programs/${p.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-bone/15 bg-ink/30 backdrop-blur-sm p-6 hover:border-electric transition-colors flex flex-col"
              >
                <span className="font-display uppercase tracking-wider text-[10px] text-steel border border-line inline-block w-fit px-2 py-0.5">
                  {p.tag}
                </span>
                <p className="font-display uppercase tracking-wider text-bone text-xl mt-4">
                  {p.title}
                </p>
                <p className="text-sm text-bone/60 mt-2 leading-relaxed flex-1">{p.desc}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-display uppercase tracking-wider text-sm text-electric group-hover:text-bone transition-colors">
                  Open Program PDF →
                </span>
              </a>
            ))}
          </div>

          <p className="mt-8 text-xs text-bone/40 leading-relaxed max-w-xl">
            Want more than a starter week? The full sessions, the Hutch Touch performance
            rotation, and weekly programming live in the{" "}
            <a href="/clients" className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors">
              Client Portal
            </a>
            .
          </p>
        </div>
      </section>
    );
  }

  // ---- PORTAL: members' weekly programs (active/upcoming/archived) ----
  const now = new Date();
  const order = { active: 0, upcoming: 1, archived: 2 } as const;
  const sorted = [...weeklyPrograms].sort(
    (a, b) => order[statusOf(a, now)] - order[statusOf(b, now)]
  );
  const list = single ? sorted.slice(0, 1) : sorted;

  return (
    <section>
      <div>
        <div className="max-w-2xl mb-10">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            {single ? "This Week's Program" : "Weekly Programs"}
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            {single ? (
              <>
                One program.
                <br />
                Every <span className="text-electric">member.</span>
              </>
            ) : (
              <>
                A new program
                <br />
                every <span className="text-electric">week.</span>
              </>
            )}
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            {single
              ? "This week's program — released for every member to run. Open it for the full session breakdown."
              : "Each week, a fresh training program drops — built for a specific purpose: hypertrophy, strength, conditioning, deload. Active and upcoming programs below — open one to see every session."}
          </p>
        </div>

        <div className="grid gap-4">
          {list.map((p) => (
            <ProgramCard key={p.id} p={p} mode={mode} />
          ))}
        </div>
      </div>
    </section>
  );
}
