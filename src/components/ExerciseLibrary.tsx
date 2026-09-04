"use client";

import { useMemo, useState } from "react";
import { exercises } from "@/data/exercises";

// All categories present in the data, plus "All" for no filter.
const categories = ["All", ...Array.from(new Set(exercises.map((e) => e.category)))];

export default function ExerciseLibrary() {
  const [filter, setFilter] = useState<string>("All");
  const [openName, setOpenName] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "All" ? exercises : exercises.filter((e) => e.category === filter)),
    [filter]
  );

  return (
    <div>
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={
              "px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
              (filter === c
                ? "bg-electric text-ink"
                : "text-bone/60 hover:text-electric border border-bone/20 hover:border-electric")
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* Exercise cards */}
      <ul className="grid gap-3">
        {filtered.map((ex) => {
          const isOpen = openName === ex.name;
          return (
            <li key={ex.name} className="border border-bone/15 bg-ink/30 backdrop-blur-sm">
              <button
                onClick={() => setOpenName(isOpen ? null : ex.name)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:border-electric transition-colors"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="font-display uppercase tracking-wider text-bone block">
                    {ex.name}
                  </span>
                  <span className="text-xs text-bone/60 mt-1 block">
                    {ex.muscles}
                  </span>
                </span>
                <span className="shrink-0 flex items-center gap-3">
                  <span className="font-display uppercase tracking-wider text-[10px] text-electric border border-electric/40 px-2 py-1">
                    {ex.category}
                  </span>
                  <span className="font-display text-electric text-xl">
                    {isOpen ? "−" : "+"}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 grid gap-5 border-t border-bone/10 pt-5">
                  {/* How to */}
                  <div>
                    <p className="glow font-display uppercase tracking-wider text-electric text-xs mb-3">
                      How to do it
                    </p>
                    <ol className="grid gap-2">
                      {ex.howTo.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="font-display text-electric text-sm shrink-0 w-5">
                            {i + 1}.
                          </span>
                          <span className="text-sm text-bone/85 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Why it matters */}
                  <div className="border-l-2 border-electric pl-4">
                    <p className="glow font-display uppercase tracking-wider text-electric text-xs mb-2">
                      Why it matters
                    </p>
                    <p className="text-sm text-bone/85 leading-relaxed">{ex.why}</p>
                  </div>

                  {/* Common mistakes */}
                  <div>
                    <p className="glow font-display uppercase tracking-wider text-electric text-xs mb-3">
                      Common mistakes to avoid
                    </p>
                    <ul className="grid gap-2">
                      {ex.mistakes.map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-electric font-display mt-0.5">✕</span>
                          <span className="text-sm text-bone/75 leading-relaxed">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
