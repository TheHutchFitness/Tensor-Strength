"use client";

import { useEffect, useMemo, useState } from "react";
import {
  exercises as ALL_EXERCISES,
  splits as SPLITS,
  MUSCLES,
  CATEGORIES,
  type Exercise,
  type Muscle,
  type Category,
} from "./exerciseData";
import {
  hutchTouchSessions,
  HUTCH_TOUCH_PRIMARIES,
  type HutchTouchDay,
} from "@/data/hutchTouchProgram";

type Set = { id: string; weight: string; reps: string; rpe: string };
type SessionExercise = {
  id: string;
  name: string;
  cue?: string;
  sets: Set[];
};
type Workout = {
  id: string;
  date: string;
  title: string;
  notes: string;
  exercises: SessionExercise[];
};

const WORKOUT_KEY = "hutch-workouts";
const CUSTOM_KEY = "hutch-custom-exercises";

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function WorkoutLog() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [activeSplitId, setActiveSplitId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [session, setSession] = useState<SessionExercise[]>([]);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // The Hutch Touch loader state
  const [hutchOpen, setHutchOpen] = useState(false);
  const [htWeek, setHtWeek] = useState(1);
  const [htDay, setHtDay] = useState<HutchTouchDay>("Push");

  function loadHutchTouchSession() {
    const s = hutchTouchSessions.find((x) => x.week === htWeek && x.day === htDay);
    if (!s) return;
    const loaded: SessionExercise[] = s.exercises.map((ex) => ({
      id: uid(),
      name: ex.exercise,
      cue: `${ex.sets} · ${ex.load} · ${ex.notes}`,
      sets: [{ id: uid(), weight: "", reps: "", rpe: "" }],
    }));
    setSession(loaded);
    setSessionTitle(`The Hutch Touch — W${htWeek} ${htDay}`);
    setActiveSplitId(null);
    setHutchOpen(false);
  }

  useEffect(() => {
    try {
      const w = localStorage.getItem(WORKOUT_KEY);
      if (w) setWorkouts(JSON.parse(w));
      const c = localStorage.getItem(CUSTOM_KEY);
      if (c) setCustomExercises(JSON.parse(c));
    } catch {}
  }, []);

  const library: Exercise[] = useMemo(
    () => [...customExercises, ...ALL_EXERCISES],
    [customExercises]
  );

  function persistWorkouts(list: Workout[]) {
    setWorkouts(list);
    localStorage.setItem(WORKOUT_KEY, JSON.stringify(list));
  }
  function persistCustom(list: Exercise[]) {
    setCustomExercises(list);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  }

  const activeSplit = SPLITS.find((s) => s.id === activeSplitId) || null;

  function openLibraryForSplit(splitId: string) {
    setActiveSplitId(splitId);
    setLibraryOpen(true);
  }

  // ---- Exercise library state ----
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<Muscle | "ALL">("ALL");
  const [catFilter, setCatFilter] = useState<Category | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [newExName, setNewExName] = useState("");
  const [newExCue, setNewExCue] = useState("");

  function resetLibrary() {
    setSearch("");
    setMuscleFilter("ALL");
    setCatFilter(null);
    setSelected([]);
    setNewExName("");
    setNewExCue("");
  }

  function closeLibrary() {
    setLibraryOpen(false);
    resetLibrary();
  }

  const filteredExercises = useMemo(() => {
    let list = library;
    // If a split is active with muscles, default-scope to those muscles unless user overrides
    if (activeSplit && activeSplit.muscles.length > 0 && muscleFilter === "ALL") {
      list = list.filter((e) => activeSplit.muscles.includes(e.muscle));
    } else if (muscleFilter !== "ALL") {
      list = list.filter((e) => e.muscle === muscleFilter);
    }
    if (catFilter) list = list.filter((e) => e.categories.includes(catFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [library, activeSplit, muscleFilter, catFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<Muscle, Exercise[]>();
    for (const e of filteredExercises) {
      if (!map.has(e.muscle)) map.set(e.muscle, []);
      map.get(e.muscle)!.push(e);
    }
    return Array.from(map.entries()).sort(
      (a, b) => MUSCLES.indexOf(a[0]) - MUSCLES.indexOf(b[0])
    );
  }, [filteredExercises]);

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function addCustomExercise() {
    if (!newExName.trim()) return;
    const ex: Exercise = {
      id: "cu" + uid(),
      name: newExName.trim(),
      muscle: muscleFilter !== "ALL" ? muscleFilter : activeSplit && activeSplit.muscles[0] ? activeSplit.muscles[0] : "CHEST",
      categories: [],
      description: newExCue.trim() || "Custom exercise.",
    };
    persistCustom([ex, ...customExercises]);
    setSelected((s) => [...s, ex.id]);
    setNewExName("");
    setNewExCue("");
  }

  function addSelectedToSession() {
    const chosen = library.filter((e) => selected.includes(e.id));
    const newEx: SessionExercise[] = chosen.map((e) => ({
      id: uid(),
      name: e.name,
      cue: e.description,
      sets: [{ id: uid(), weight: "", reps: "", rpe: "" }],
    }));
    setSession((s) => [...s, ...newEx]);
    closeLibrary();
  }

  // ---- Session editing ----
  function addSet(exId: string) {
    setSession((s) =>
      s.map((e) => (e.id === exId ? { ...e, sets: [...e.sets, { id: uid(), weight: "", reps: "", rpe: "" }] } : e))
    );
  }
  function removeSet(exId: string, setId: string) {
    setSession((s) =>
      s.map((e) =>
        e.id === exId ? { ...e, sets: e.sets.filter((st) => st.id !== setId) } : e
      )
    );
  }
  function updateSet(exId: string, setId: string, field: keyof Set, value: string) {
    setSession((s) =>
      s.map((e) =>
        e.id === exId
          ? { ...e, sets: e.sets.map((st) => (st.id === setId ? { ...st, [field]: value } : st)) }
          : e
      )
    );
  }
  function removeExercise(exId: string) {
    setSession((s) => s.filter((e) => e.id !== exId));
  }
  function addExerciseManual() {
    setSession((s) => [
      ...s,
      { id: uid(), name: "", cue: "", sets: [{ id: uid(), weight: "", reps: "", rpe: "" }] },
    ]);
  }

  function saveWorkout() {
    const clean = session
      .filter((e) => e.name.trim() || e.sets.some((st) => st.weight || st.reps))
      .map((e) => ({ ...e, sets: e.sets.filter((st) => st.weight || st.reps) }));
    if (clean.length === 0) return;
    const w: Workout = {
      id: uid(),
      date: sessionDate || new Date().toLocaleDateString(),
      title: sessionTitle || (activeSplit?.name ?? "Workout"),
      notes: sessionNotes,
      exercises: clean,
    };
    persistWorkouts([w, ...workouts]);
    setSession([]);
    setSessionTitle("");
    setSessionNotes("");
    setSessionDate("");
    setActiveSplitId(null);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  function deleteWorkout(id: string) {
    persistWorkouts(workouts.filter((w) => w.id !== id));
  }

  const setCell =
    "bg-ink/40 border border-bone/20 px-2 py-1.5 text-bone text-center focus:border-electric outline-none w-full";

  return (
    <div className="grid gap-8">
      {/* SPLIT SELECTOR */}
      <div>
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
          Select Your Split
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SPLITS.map((s) => (
            <button
              key={s.id}
              onClick={() => openLibraryForSplit(s.id)}
              className={
                "text-left p-4 transition-colors " +
                (s.custom
                  ? "border-2 border-dashed border-bone/30 hover:border-electric bg-transparent"
                  : "border border-bone/15 hover:border-electric bg-ink/30")
              }
            >
              <p className="font-display uppercase tracking-wider text-bone font-600">{s.name}</p>
              <p className="text-xs text-bone/50 mt-1">{s.subtitle}</p>
              {!s.custom && (
                <p className="text-[10px] uppercase tracking-wider text-electric mt-2">
                  {library.filter((e) => s.muscles.includes(e.muscle)).length} exercises
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Load The Hutch Touch program */}
        <div className="mt-5 border-2 border-electric/40 bg-electric/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-display uppercase tracking-wider text-electric text-sm">
              The Hutch Touch
            </p>
            <p className="text-xs text-bone/60 mt-1 leading-relaxed">
              Load any session from the 8-week PPL performance block straight into the
              tracker — every exercise pre-filled, ready to log.
            </p>
          </div>
          <button
            onClick={() => setHutchOpen(true)}
            className="bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors whitespace-nowrap"
          >
            Load a Session →
          </button>
        </div>
      </div>

      {/* HUTCH TOUCH PICKER MODAL */}
      {hutchOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0a0420] border-2 border-electric p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="glow font-display uppercase tracking-wider text-electric">
                The Hutch Touch
              </p>
              <button onClick={() => setHutchOpen(false)} className="text-bone/60 hover:text-electric text-xl">
                ✕
              </button>
            </div>

            <p className="font-display uppercase tracking-wider text-xs text-bone/70 mb-2">
              Week
            </p>
            <div className="grid grid-cols-8 gap-1.5 mb-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => setHtWeek(w)}
                  className={
                    "h-9 font-display text-sm transition-colors " +
                    (htWeek === w
                      ? "bg-electric text-ink"
                      : "border border-bone/20 text-bone/60 hover:border-electric hover:text-electric")
                  }
                >
                  {w}
                </button>
              ))}
            </div>

            <p className="font-display uppercase tracking-wider text-xs text-bone/70 mb-2">
              Day
            </p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {(["Push", "Pull", "Legs"] as HutchTouchDay[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setHtDay(d)}
                  className={
                    "px-4 py-2.5 font-display uppercase tracking-wider text-sm transition-colors " +
                    (htDay === d
                      ? "bg-electric text-ink"
                      : "border border-bone/20 text-bone/60 hover:border-electric hover:text-electric")
                  }
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="text-xs text-bone/50 mb-5 leading-relaxed border-l-2 border-electric/40 pl-3">
              Primary lift: <span className="text-electric">{HUTCH_TOUCH_PRIMARIES[htDay]}</span>
              {" · "}
              {(() => {
                const s = hutchTouchSessions.find((x) => x.week === htWeek && x.day === htDay);
                return s ? `${s.exercises.length} exercises in this session` : "";
              })()}
            </div>

            <button
              onClick={loadHutchTouchSession}
              className="w-full bg-electric text-ink py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
            >
              Load Week {htWeek} {htDay} →
            </button>
          </div>
        </div>
      )}
      {session.length > 0 && (
        <div className="border-t border-bone/15 pt-8">
          <div className="flex items-center justify-between mb-4">
            <p className="glow font-display uppercase tracking-[0.3em] text-bone/70 text-sm">
              Active Session
            </p>
            <button
              onClick={() => setSession([])}
              className="font-display uppercase tracking-wider text-xs text-bone/40 hover:text-electric"
            >
              Clear
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <input
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder={activeSplit?.name ? `${activeSplit.name} — Session` : "Session title"}
              className="bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none"
            />
            <input
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              placeholder={new Date().toLocaleDateString()}
              className="bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none"
            />
          </div>

          <div className="grid gap-4">
            {session.map((ex, i) => (
              <div key={ex.id} className="border border-bone/15 bg-ink/20 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-display text-electric text-sm">#{i + 1}</span>
                  <input
                    value={ex.name}
                    onChange={(e) =>
                      setSession((s) => s.map((x) => (x.id === ex.id ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder="Exercise name"
                    className="bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none flex-1"
                  />
                  <button onClick={() => removeExercise(ex.id)} className="text-bone/40 hover:text-electric">
                    ✕
                  </button>
                </div>
                {ex.cue && <p className="text-xs text-bone/50 mb-3 italic">{ex.cue}</p>}

                <div className="grid grid-cols-[28px_1fr_1fr_1fr_24px] gap-2 items-center text-[10px] uppercase tracking-wider text-bone/50 mb-1">
                  <span>Set</span>
                  <span className="text-center">Weight</span>
                  <span className="text-center">Reps</span>
                  <span className="text-center">RPE</span>
                  <span />
                </div>
                <div className="grid gap-2">
                  {ex.sets.map((st, si) => (
                    <div key={st.id} className="grid grid-cols-[28px_1fr_1fr_1fr_24px] gap-2 items-center">
                      <span className="font-display text-bone/60 text-sm text-center">{si + 1}</span>
                      <input value={st.weight} onChange={(e) => updateSet(ex.id, st.id, "weight", e.target.value)} placeholder="—" className={setCell} />
                      <input value={st.reps} onChange={(e) => updateSet(ex.id, st.id, "reps", e.target.value)} placeholder="—" className={setCell} />
                      <input value={st.rpe} onChange={(e) => updateSet(ex.id, st.id, "rpe", e.target.value)} placeholder="—" className={setCell} />
                      {ex.sets.length > 1 ? (
                        <button onClick={() => removeSet(ex.id, st.id)} className="text-bone/40 hover:text-electric text-sm">✕</button>
                      ) : <span />}
                    </div>
                  ))}
                </div>
                <button onClick={() => addSet(ex.id)} className="mt-3 font-display uppercase tracking-wider text-xs text-electric hover:text-bone">
                  + Add Set
                </button>
              </div>
            ))}
          </div>

          <button onClick={addExerciseManual} className="mt-4 font-display uppercase tracking-wider text-sm text-electric hover:text-bone">
            + Add Exercise Manually
          </button>

          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            rows={2}
            placeholder="Notes — how did it feel? What's next week?"
            className="mt-4 w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none resize-none"
          />

          <button
            onClick={saveWorkout}
            className="mt-2 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
          >
            Save Workout
          </button>
          {savedFlash && (
            <p className="mt-3 font-display uppercase tracking-wider text-sm text-electric">
              ✓ Workout saved to this device.
            </p>
          )}
        </div>
      )}

      {/* HISTORY */}
      <div className="border-t border-bone/15 pt-8">
        <p className="glow font-display uppercase tracking-[0.3em] text-bone/70 text-sm mb-4">
          Workout History
        </p>
        {workouts.length === 0 ? (
          <p className="text-bone/50 font-display uppercase tracking-wider text-sm">
            No workouts logged yet. Pick a split to start.
          </p>
        ) : (
          <ul className="grid gap-3 max-h-[460px] overflow-y-auto">
            {workouts.map((w) => (
              <li key={w.id} className="border border-bone/15 bg-ink/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display uppercase tracking-wider text-bone">{w.title}</p>
                    <p className="text-xs text-bone/50">{w.date}</p>
                  </div>
                  <button onClick={() => deleteWorkout(w.id)} className="text-bone/40 hover:text-electric text-sm">✕</button>
                </div>
                <ul className="mt-3 grid gap-2">
                  {w.exercises.map((ex) => (
                    <li key={ex.id} className="text-sm">
                      <p className="font-display uppercase tracking-wider text-bone/80 text-xs">{ex.name}</p>
                      <p className="text-bone/60 text-xs mt-0.5">
                        {ex.sets.map((s) => `${s.weight}×${s.reps}${s.rpe ? ` @${s.rpe}` : ""}`).join("  ·  ")}
                      </p>
                    </li>
                  ))}
                </ul>
                {w.notes && <p className="mt-3 text-xs text-bone/50 border-t border-bone/10 pt-2">{w.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* EXERCISE LIBRARY MODAL */}
      {libraryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-[#0a0420] border-2 border-electric">
            <div className="flex items-center justify-between px-5 py-4 border-b border-bone/15">
              <p className="glow font-display uppercase tracking-wider text-electric">Exercise Library</p>
              <button onClick={closeLibrary} className="text-bone/60 hover:text-electric text-xl">✕</button>
            </div>

            <div className="overflow-y-auto p-5 flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full bg-ink/50 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none mb-3"
              />

              {/* Muscle filter pills */}
              <div className="flex flex-wrap gap-2 mb-2">
                <FilterPill active={muscleFilter === "ALL"} onClick={() => setMuscleFilter("ALL")}>ALL</FilterPill>
                {MUSCLES.map((m) => (
                  <FilterPill key={m} active={muscleFilter === m} onClick={() => setMuscleFilter(m)}>
                    {m}
                  </FilterPill>
                ))}
              </div>
              {/* Category filter pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORIES.map((c) => (
                  <FilterPill key={c} active={catFilter === c} onClick={() => setCatFilter(catFilter === c ? null : c)} small>
                    {c}
                  </FilterPill>
                ))}
              </div>

              {/* Add your own */}
              <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 mb-5 items-end bg-ink/30 p-3 border border-bone/10">
                <div>
                  <span className="font-display uppercase tracking-wider text-[10px] text-bone/50">Add your own exercise</span>
                  <input
                    value={newExName}
                    onChange={(e) => setNewExName(e.target.value)}
                    placeholder="e.g. Trap Bar Deadlift"
                    className="mt-1 w-full bg-ink/50 border border-bone/20 px-2 py-1.5 text-bone text-sm focus:border-electric outline-none"
                  />
                </div>
                <div>
                  <span className="font-display uppercase tracking-wider text-[10px] text-bone/50">Your own note / cue (optional)</span>
                  <input
                    value={newExCue}
                    onChange={(e) => setNewExCue(e.target.value)}
                    placeholder="Cue or description"
                    className="mt-1 w-full bg-ink/50 border border-bone/20 px-2 py-1.5 text-bone text-sm focus:border-electric outline-none"
                  />
                </div>
                <button
                  onClick={addCustomExercise}
                  className="bg-electric text-ink px-4 py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors"
                >
                  + Add
                </button>
              </div>

              {/* Grouped exercise list */}
              {grouped.length === 0 ? (
                <p className="text-bone/50 text-sm text-center py-8 font-display uppercase tracking-wider">
                  No exercises match.
                </p>
              ) : (
                grouped.map(([muscle, list]) => (
                  <div key={muscle} className="mb-5">
                    <p className="font-display uppercase tracking-[0.3em] text-bone/50 text-xs mb-2">{muscle}</p>
                    <ul className="grid gap-2">
                      {list.map((ex) => {
                        const checked = selected.includes(ex.id);
                        return (
                          <li key={ex.id}>
                            <button
                              onClick={() => toggleSelect(ex.id)}
                              className={
                                "w-full text-left p-3 flex items-start gap-3 border transition-colors " +
                                (checked
                                  ? "border-electric bg-electric/10"
                                  : "border-bone/10 bg-ink/30 hover:border-bone/30")
                              }
                            >
                              <span className={"mt-0.5 w-5 h-5 shrink-0 border-2 flex items-center justify-center " + (checked ? "border-electric bg-electric" : "border-bone/40")}>
                                {checked && <span className="text-ink text-xs font-bold">✓</span>}
                              </span>
                              <span className="flex-1">
                                <span className="font-display uppercase tracking-wider text-sm text-bone block">
                                  {ex.name}
                                </span>
                                <span className="text-xs text-bone/55 leading-relaxed block mt-0.5">
                                  {ex.description}
                                </span>
                                {ex.categories.length > 0 && (
                                  <span className="flex gap-1 mt-1.5 flex-wrap">
                                    {ex.categories.map((c) => (
                                      <span key={c} className="text-[9px] uppercase tracking-wider text-electric border border-electric/40 px-1.5 py-0.5">
                                        {c}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-4 border-t border-bone/15">
              <button
                onClick={addSelectedToSession}
                disabled={selected.length === 0}
                className="w-full bg-electric text-ink py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-40 disabled:hover:bg-electric"
              >
                {selected.length > 0 ? `Add ${selected.length} Exercise${selected.length > 1 ? "s" : ""}` : "Select exercises to add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  small,
  children,
}: {
  active: boolean;
  onClick: () => void;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border font-display uppercase tracking-wider transition-colors " +
        (small ? "text-[10px] px-2.5 py-1" : "text-xs px-3 py-1.5") +
        (active
          ? " bg-electric text-ink border-electric"
          : " text-bone/60 border-bone/25 hover:border-electric hover:text-electric")
      }
    >
      {children}
    </button>
  );
}
