"use client";

import { useMemo, useState } from "react";
import { warmups } from "@/data/warmups";

const categories = [
  "All",
  ...Array.from(new Set(warmups.map((w) => w.category))),
];

export default function WarmupLibrary() {
  const [filter, setFilter] = useState<string>("All");
  const [openName, setOpenName] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filter === "All" ? warmups : warmups.filter((w) => w.category === filter),
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

      {/* Routine cards */}
      <ul className="grid gap-3">
        {filtered.map((w) => {
          const isOpen = openName === w.name;
          return (
            <li
              key={w.name}
              className="border border-bone/15 bg-ink/30 backdrop-blur-sm"
            >
              <button
                onClick={() => setOpenName(isOpen ? null : w.name)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:border-electric transition-colors"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="font-display uppercase tracking-wider text-bone block">
                    {w.name}
                  </span>
                  <span className="text-xs text-bone/60 mt-1 block">
                    {w.duration} · {w.purpose}
                  </span>
                </span>
                <span className="shrink-0 flex items-center gap-3">
                  <span className="font-display uppercase tracking-wider text-[10px] text-electric border border-electric/40 px-2 py-1 whitespace-nowrap">
                    {w.category}
                  </span>
                  <span className="font-display text-electric text-xl">
                    {isOpen ? "−" : "+"}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 grid gap-5 border-t border-bone/10 pt-5">
                  {/* The routine */}
                  <div>
                    <p className="glow font-display uppercase tracking-wider text-electric text-xs mb-3">
                      The routine
                    </p>
                    <ol className="grid gap-2">
                      {w.steps.map((step, i) => {
                        const isSubStep = /^\s+/.test(step);
                        return (
                          <li
                            key={i}
                            className={
                              "flex items-start gap-3 " +
                              (isSubStep ? "pl-5" : "")
                            }
                          >
                            <span className="font-display text-electric text-sm shrink-0 w-5">
                              {isSubStep ? "•" : `${i + 1}.`}
                            </span>
                            <span className="text-sm text-bone/85 leading-relaxed">
                              {step.trim()}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* Coaching notes */}
                  <div className="border-l-2 border-electric pl-4">
                    <p className="glow font-display uppercase tracking-wider text-electric text-xs mb-2">
                      Coaching notes
                    </p>
                    <p className="text-sm text-bone/85 leading-relaxed">
                      {w.coaching}
                    </p>
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
