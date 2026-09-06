"use client";

import { useMemo, useState } from "react";
import { exercises } from "@/data/exercises";
import { useCloudState } from "@/lib/cloud";

// All categories present in the data, plus "All" for no filter.
const categories = ["All", ...Array.from(new Set(exercises.map((e) => e.category)))];

const FAVES_KEY = "ts_exercise_faves";

const levelStyles: Record<string, string> = {
  Beginner: "text-emerald-400 border-emerald-400/40",
  Intermediate: "text-amber-400 border-amber-400/40",
  Advanced: "text-rose-400 border-rose-400/40",
};

export default function ExerciseLibrary() {
  const [filter, setFilter] = useState<string>("All");
  const [query, setQuery] = useState<string>("");
  const [openName, setOpenName] = useState<string | null>(null);
  const [faves, setFaves] = useCloudState<string[]>(FAVES_KEY, []);
  const [onlyFaves, setOnlyFaves] = useState<boolean>(false);

  const toggleFave = (name: string) => {
    setFaves((prev) => {
      const next = prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name];
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = exercises.filter((e) => {
      const matchesCategory = filter === "All" || e.category === filter;
      const matchesQuery =
        q === "" ||
        e.name.toLowerCase().includes(q) ||
        e.muscles.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      const matchesFave = !onlyFaves || faves.includes(e.name);
      return matchesCategory && matchesQuery && matchesFave;
    });
    // Pin favourites to the top, otherwise keep original order.
    return [...list].sort((a, b) => {
      const af = faves.includes(a.name) ? 0 : 1;
      const bf = faves.includes(b.name) ? 0 : 1;
      return af - bf;
    });
  }, [filter, query, faves, onlyFaves]);

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a lift, muscle or category…"
          className="w-full bg-ink/40 border border-bone/20 focus:border-electric outline-none text-bone placeholder:text-bone/40 px-4 py-3 pr-10 text-sm tracking-wide transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-bone/50 hover:text-electric font-display text-lg"
          >
            ×
          </button>
        )}
      </div>

      {/* Category filter chips + favourites toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setOnlyFaves((v) => !v)}
          className={
            "px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors flex items-center gap-1.5 " +
            (onlyFaves
              ? "bg-electric text-ink"
              : "text-bone/60 hover:text-electric border border-bone/20 hover:border-electric")
          }
        >
          <span className={onlyFaves ? "text-ink" : "text-electric"}>★</span>
          Favourites{faves.length ? ` (${faves.length})` : ""}
        </button>
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

      {/* Result count */}
      <p className="text-xs text-bone/50 mb-4 font-display uppercase tracking-wider">
        {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
      </p>

      {/* Exercise cards */}
      <ul className="grid gap-3">
        {filtered.length === 0 && (
          <li className="border border-bone/15 bg-ink/30 px-5 py-8 text-center text-sm text-bone/50">
            {onlyFaves
              ? "No favourites yet. Tap the ★ on any lift to pin it here."
              : "No exercises match your search. Try a different name, muscle or category."}
          </li>
        )}
        {filtered.map((ex) => {
          const isOpen = openName === ex.name;
          const isFave = faves.includes(ex.name);
          return (
            <li key={ex.name} className="border border-bone/15 bg-ink/30 backdrop-blur-sm">
              <div className="w-full flex items-center gap-2 px-5 py-4">
                {/* Favourite star */}
                <button
                  onClick={() => toggleFave(ex.name)}
                  aria-label={isFave ? "Remove from favourites" : "Add to favourites"}
                  aria-pressed={isFave}
                  className={
                    "shrink-0 text-xl leading-none transition-colors " +
                    (isFave ? "text-electric" : "text-bone/30 hover:text-electric")
                  }
                >
                  {isFave ? "★" : "☆"}
                </button>

                <button
                  onClick={() => setOpenName(isOpen ? null : ex.name)}
                  className="flex-1 min-w-0 flex items-center justify-between gap-4 text-left"
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
                  <span className="shrink-0 flex items-center gap-2">
                    <span
                      className={
                        "font-display uppercase tracking-wider text-[10px] px-2 py-1 border " +
                        (levelStyles[ex.level] || "text-bone/60 border-bone/30")
                      }
                    >
                      {ex.level}
                    </span>
                    <span className="hidden sm:inline font-display uppercase tracking-wider text-[10px] text-electric border border-electric/40 px-2 py-1">
                      {ex.category}
                    </span>
                    <span className="font-display text-electric text-xl">
                      {isOpen ? "−" : "+"}
                    </span>
                  </span>
                </button>
              </div>

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
