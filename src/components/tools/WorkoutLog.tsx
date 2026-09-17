"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cloudSet, emitCloudSaved } from "../../lib/cloud";
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
  HUTCH_TOUCH_BENCH_PROGRESSION,
  HUTCH_TOUCH_SQUAT_ROTATION,
  HUTCH_TOUCH_DEADLIFT_ROTATION,
  type HutchTouchSessionId,
} from "../../data/hutchTouchProgram";
import { bestStrengthEstimate, localWorkoutDate, isCompletedSet } from "../../lib/workoutMetrics";
import { memberPrograms } from "../../data/memberPrograms";
import { exercises as exerciseGuides } from "../../data/exercises";

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
type Template = {
  id: string;
  name: string;
  exercises: SessionExercise[];
};
type DemoVideo = { id: string; title: string; description?: string; url: string };

const WORKOUT_KEY = "hutch-workouts";
const CUSTOM_KEY = "hutch-custom-exercises";
const TEMPLATE_KEY = "hutch-templates";
const VARIATION_KEY = "hutch-variations";

// Which main compound lift rotates on each Hutch Touch session, and its
// variation-progression list. Sumo deadlift stays constant on Lower Pull day —
// it's the SECONDARY hinge that rotates there.
type VarState = { bench: number; squat: number; deadlift: number };
const HUTCH_ORDER: HutchTouchSessionId[] = ["push", "lower-pull", "upper-pull", "legs"];
const HUTCH_MAIN_LIFT: Record<
  HutchTouchSessionId,
  { slot: string; key: keyof VarState; progression: { variation: string; purpose: string; detail: string }[] } | null
> = {
  push: { slot: "Bench variation", key: "bench", progression: HUTCH_TOUCH_BENCH_PROGRESSION },
  legs: { slot: "Squat variation", key: "squat", progression: HUTCH_TOUCH_SQUAT_ROTATION },
  "lower-pull": { slot: "Secondary deadlift / hinge", key: "deadlift", progression: HUTCH_TOUCH_DEADLIFT_ROTATION },
  "upper-pull": null,
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function normaliseExerciseName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findExerciseGuide(name: string) {
  const key = normaliseExerciseName(name);
  return exerciseGuides.find((guide) => {
    const candidate = normaliseExerciseName(guide.name);
    return candidate === key || candidate.includes(key) || key.includes(candidate);
  });
}

// Ordered variation-progression list for a main compound lift (Hutch Touch).
function VariationList({
  title,
  steps,
}: {
  title: string;
  steps: { variation: string; purpose: string; detail: string }[];
}) {
  return (
    <div className="border border-bone/10 bg-ink/30 p-4">
      <p className="font-display uppercase tracking-wider text-electric text-xs mb-3">{title}</p>
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

export default function WorkoutLog({ userId, accessType = "" }: { userId: string; accessType?: string }) {
  const [trackerReady, setTrackerReady] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [draftReady, setDraftReady] = useState(false);
  const draftKey = `ts-workout-draft:${userId}`;
  const draftWorkoutId = useRef(uid());
  const focusSession = useRef<HTMLDivElement>(null);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [prCelebration, setPrCelebration] = useState<{ name: string; e1rm: number; prev: number }[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [chartLift, setChartLift] = useState<string>("");
  const [templateFlash, setTemplateFlash] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [activeSplitId, setActiveSplitId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [session, setSession] = useState<SessionExercise[]>([]);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [nextSessionAfterSave, setNextSessionAfterSave] = useState<{ title: string; href: string } | null>(null);
  const [helpOpenId, setHelpOpenId] = useState<string | null>(null);
  const programLinkHandled = useRef("");

  // ---- Integrated rest timer (lives inside the tracker, not a separate tool) ----
  const [restDuration, setRestDuration] = useState(90); // last-used preset, seconds
  const [restLeft, setRestLeft] = useState(0); // seconds remaining
  const [restRunning, setRestRunning] = useState(false);
  const restDeadline = useRef(0);

  function beep() {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.62);
      osc.onended = () => ctx.close().catch(() => {});
    } catch {}
  }

  function startRest(secs?: number) {
    const d = secs ?? restDuration;
    setRestDuration(d);
    restDeadline.current = Date.now() + d * 1000;
    setRestLeft(d);
    setRestRunning(true);
  }
  function stopRest() {
    setRestRunning(false);
    setRestLeft(0);
  }

  useEffect(() => {
    if (!restRunning) return;
    const id = setInterval(() => {
      setRestLeft(() => {
        const remaining = Math.max(0, Math.ceil((restDeadline.current - Date.now()) / 1000));
        if (remaining <= 0) {
          clearInterval(id);
          setRestRunning(false);
          beep();
          try { (navigator as any).vibrate?.([200, 80, 200]); } catch {}
          return 0;
        }
        return remaining;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restRunning]);

  // The Hutch Touch loader state — the program runs as a 4-session rotation.
  const [hutchOpen, setHutchOpen] = useState(false);
  const [variationsOpen, setVariationsOpen] = useState(false);
  // Which variation index each main lift is currently on (auto-advances).
  const [variations, setVariations] = useState<VarState>({ bench: 0, squat: 0, deadlift: 0 });
  // The Hutch Touch session currently loaded into the tracker (for auto-advance on save).
  const [loadedHutchId, setLoadedHutchId] = useState<HutchTouchSessionId | null>(null);
  // Readiness check: which session we're about to load (drives the prompt), and
  // how the last-loaded session was flagged (light days don't advance variations).
  const [readinessFor, setReadinessFor] = useState<HutchTouchSessionId | null>(null);
  const [loadedReadiness, setLoadedReadiness] = useState<"green" | "yellow" | "light">("green");
  // Member-only extra programs (loaded straight into the tracker).
  const [coachPrograms, setCoachPrograms] = useState<any[]>([]);
  const [helpVideos, setHelpVideos] = useState<DemoVideo[]>([]);
  useEffect(() => {
    fetch("/api/member/programs").then((r) => (r.ok ? r.json() : null)).then((d) => d?.programs && setCoachPrograms(d.programs)).catch(() => {});
    fetch("/api/member/videos").then((r) => (r.ok ? r.json() : null)).then((d) => setHelpVideos(d?.videos || [])).catch(() => {});
  }, []);
  const allPrograms: any[] = [...memberPrograms, ...coachPrograms];

  function loadMemberSession(programId: string, sessionId: string, deload = false) {
    if (!canReplaceSession()) return false;
    draftWorkoutId.current = uid();
    const p = allPrograms.find((x: any) => x.id === programId);
    const s = p?.sessions.find((x: any) => x.id === sessionId);
    if (!p || !s) return false;
    const work: SessionExercise[] = s.exercises.map((ex: any) => {
      const countMatch = (ex.sets || "").match(/(\d+)/);
      let count = Math.max(1, Math.min(8, countMatch ? parseInt(countMatch[1], 10) : 1));
      if (deload) count = Math.max(1, Math.ceil(count * 0.6)); // fewer sets on a deload
      const rpe = deload ? "6" : ex.rpe || "";
      const sets: Set[] = Array.from({ length: count }, () => ({ id: uid(), weight: "", reps: ex.reps || "", rpe }));
      const isTime = /min|sec|:/i.test(ex.reps || "");
      const setLabel = count === 1 ? "1 set" : `${count} sets`;
      const parts: string[] = [setLabel];
      if (ex.reps) parts.push(isTime ? ex.reps : `${ex.reps} reps`);
      parts.push(`RPE ${rpe}`);
      let cue = `Target: ${parts.join(" · ")}` + (deload ? " — DELOAD: keep it light, leave plenty in the tank." : ex.notes ? ` — ${ex.notes}` : "");
      const lt = lastTimeHint(ex.exercise);
      if (lt) cue += `  ·  Last time: ${lt}`;
      return { id: uid(), name: ex.exercise, cue, sets };
    });
    setSession(work);
    setSessionTitle(`${p.name} — ${s.title}${deload ? " (deload)" : ""}`);
    setLoadedHutchId(null);
    setLoadedReadiness("green");
    setActiveSplitId(null);
    setCurrentTemplateId(null);
    return true;
  }

  function nextMemberSession(p: any, sourceWorkouts = workouts) {
    const ids = p.sessions.map((s: any) => s.id);
    let lastId: string | null = null;
    for (const w of sourceWorkouts) {
      const found = p.sessions.find((s: any) => (w.title || "").startsWith(`${p.name} — ${s.title}`));
      if (found) { lastId = found.id; break; }
    }
    const nextId = lastId ? ids[(ids.indexOf(lastId) + 1) % ids.length] : ids[0];
    return p.sessions.find((s: any) => s.id === nextId) || p.sessions[0];
  }

  // Auto-open a program if arriving from the "My Programs" page (?program=id).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("program");
    const targetSession = params.get("session");
    const linkKey = q && targetSession ? `${q}:${targetSession}` : "";
    if (trackerReady && linkKey && programLinkHandled.current !== linkKey) {
      const program = allPrograms.find((p) => p.id === q);
      if (program?.sessions?.some((session: any) => session.id === targetSession)) {
        if (loadMemberSession(q!, targetSession!)) {
          programLinkHandled.current = linkKey;
          window.history.replaceState({}, "", "/clients/workout-log");
        }
      }
    }
    const sid = params.get("session");
    if (trackerReady && !session.length && hutchTouchSessions.some((s) => s.id === sid)) {
      setReadinessFor(sid as HutchTouchSessionId);
    }
  }, [trackerReady, coachPrograms]);

  const coachingClient = accessType === "remote_coaching" || accessType === "in_person";

  function swapCandidates(name: string) {
    const key = normaliseExerciseName(name);
    const current = ALL_EXERCISES.find((exercise) => {
      const candidate = normaliseExerciseName(exercise.name);
      return candidate === key || candidate.includes(key) || key.includes(candidate);
    });
    if (!current) return [];
    return ALL_EXERCISES.filter((exercise) => exercise.muscle === current.muscle && exercise.id !== current.id).slice(0, 3);
  }

  function useSwap(exId: string, replacement: Exercise) {
    setSession((items) => items.map((item) => item.id === exId ? {
      ...item,
      name: replacement.name,
      cue: `${item.cue ? `${item.cue} · ` : ""}Swap selected: ${replacement.description}`,
    } : item));
    setHelpOpenId(null);
  }

  // Show the readiness check before actually loading a session.
  function promptReadiness(sid: HutchTouchSessionId) {
    setHutchOpen(false);
    setReadinessFor(sid);
  }
  const [htSession, setHtSession] = useState<HutchTouchSessionId>("push");

  // Find what the athlete lifted last time for a given movement (by exact name,
  // case-insensitive). Returns a short "225x5 · 225x5" style hint, newest first.
  function lastTimeHint(name: string): string | null {
    const key = name.trim().toLowerCase();
    for (const w of workouts) {
      const ex = w.exercises.find((e) => e.name.trim().toLowerCase() === key);
      if (ex && ex.sets.length) {
        const parts = ex.sets
          .map((st) => (st.weight ? `${st.weight}${st.reps ? `x${st.reps}` : ""}` : ""))
          .filter(Boolean);
        if (parts.length) return parts.join(" · ");
      }
    }
    return null;
  }

  function loadHutchTouchSession(explicitId?: HutchTouchSessionId, readiness: "green" | "yellow" | "light" = "green") {
    if (!canReplaceSession()) return;
    draftWorkoutId.current = uid();
    const sid = explicitId ?? htSession;
    const s = hutchTouchSessions.find((x) => x.id === sid);
    if (!s) return;
    const mainLift = HUTCH_MAIN_LIFT[s.id];
    // Warm-up movements load first, each as a light single-set entry the client
    // can tick through (or add sets to) before the working exercises.
    const warmups: SessionExercise[] = (s.warmup || []).map((w, i) => ({
      id: uid(),
      name: `Warm-up ${i + 1}: ${w}`,
      cue: "Warm-up · prep / light",
      sets: [{ id: uid(), weight: "", reps: "", rpe: "" }],
    }));
    const work: SessionExercise[] = s.exercises.map((ex) => {
      // For the rotating main lift, swap the generic "Bench variation" slot for
      // the actual variation the athlete is currently on, and add a recalibrate
      // note instead of the generic prescription note.
      let name = ex.exercise;
      let variationNote = "";
      if (mainLift && ex.exercise === mainLift.slot) {
        const idx = (variations[mainLift.key] || 0) % mainLift.progression.length;
        const v = mainLift.progression[idx];
        name = v.variation;
        variationNote = `Variation ${idx + 1}/${mainLift.progression.length} — ${v.purpose}. Recalibrate your load to hit the RPE (don't just copy last time's weight).`;
      }
      // Pre-fill sets, reps and RPE from the prescription so the client only
      // has to enter the weight they used. Sets like "3-5" -> use the lower
      // bound as a starting number of set rows (they can add up to the top end).
      const countMatch = (ex.sets || "").match(/(\d+)/);
      const count = Math.max(1, Math.min(6, countMatch ? parseInt(countMatch[1], 10) : 1));
      const sets: Set[] = Array.from({ length: count }, () => ({
        id: uid(),
        weight: "",
        reps: ex.reps || "",
        rpe: ex.rpe || "",
      }));
      // Spell out the target so users know exactly how many sets and reps to do.
      const isTime = /min|sec|:/i.test(ex.reps || "");
      const setLabel = (ex.sets || "").trim() === "1" ? "1 set" : `${ex.sets} sets`;
      const parts: string[] = [setLabel];
      if (ex.reps) parts.push(isTime ? ex.reps : `${ex.reps} reps`);
      if (ex.rpe) parts.push(`RPE ${ex.rpe}`);
      let cue = `Target: ${parts.join(" · ")}`;
      const tail = variationNote || ex.notes;
      if (tail) cue += ` — ${tail}`;
      const lt = lastTimeHint(name);
      if (lt) cue += `  ·  Last time: ${lt}`;
      return {
        id: uid(),
        name,
        cue,
        sets,
      };
    });
    setSession([...warmups, ...work]);
    const suffix = readiness === "yellow" ? " (deload)" : readiness === "light" ? " (light)" : "";
    setSessionTitle(`The Hutch Touch — ${s.title}${suffix}`);
    setSessionNotes(
      readiness === "yellow"
        ? "Yellow / a bit sore — back the working load off about 10% and stay ~1 RPE shy of the targets. Quality reps over grinding."
        : readiness === "light"
        ? "Light / technique day — very sore or run down. Keep loads easy, focus on movement quality and blood flow, and skip anything that hurts."
        : ""
    );
    setLoadedReadiness(readiness);
    setLoadedHutchId(s.id);
    setReadinessFor(null);
    setActiveSplitId(null);
    setCurrentTemplateId(null);
    setHutchOpen(false);
  }

  // Load a trainer-written program (handed off via localStorage from the portal).
  function loadProgramSession(program: any) {
    const list: SessionExercise[] = (program.exercises || []).map((ex: any) => {
      const cue = [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.load, ex.notes]
        .filter(Boolean)
        .join(" · ");
      const nSets = Math.max(1, Math.min(10, parseInt(ex.sets, 10) || 1));
      return {
        id: uid(),
        name: ex.name,
        cue,
        sets: Array.from({ length: nSets }, () => ({ id: uid(), weight: "", reps: "", rpe: "" })),
      };
    });
    setSession(list);
    setSessionTitle(program.title || "Trainer Program");
    setSessionNotes(program.notes || "");
    setActiveSplitId(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      const draft = raw ? JSON.parse(raw) : null;
      if (draft && Array.isArray(draft.session) && draft.session.length) {
        setSession(draft.session);
        setSessionTitle(draft.title || "");
        setSessionDate(draft.date || "");
        setSessionNotes(draft.notes || "");
        setLoadedHutchId(draft.hutchId || null);
        setLoadedReadiness(draft.readiness || "green");
        setCurrentTemplateId(draft.templateId || null);
        draftWorkoutId.current = draft.workoutId || uid();
      } else {
        const pending = sessionStorage.getItem("ts-pending-program");
        if (pending) {
          sessionStorage.removeItem("ts-pending-program");
          const program = JSON.parse(pending);
          if (program.userId === userId) loadProgramSession(program);
        }
      }
    } catch {}
    setDraftReady(true);
    // Cloud sync: the account is the source of truth. Pull the member's saved
    // workouts + templates and mirror them locally.
    (async () => {
      try {
        const res = await fetch("/api/client/tracker");
        if (!res.ok) throw new Error("Could not load your workout history. Reload before saving changes.");
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d.workouts)) {
            setWorkouts(d.workouts);
            try { localStorage.setItem(WORKOUT_KEY + ":" + userId, JSON.stringify(d.workouts)); } catch {}
          }
          if (Array.isArray(d.templates)) {
            setTemplates(d.templates);
            try { localStorage.setItem(TEMPLATE_KEY + ":" + userId, JSON.stringify(d.templates)); } catch {}
          }
        }
        // Custom exercises sync via the generic per-user store.
        const cs = await fetch(`/api/client/store?key=${encodeURIComponent(CUSTOM_KEY)}`);
        if (!cs.ok) throw new Error("Unable to load custom exercises");
        if (cs.ok) {
          const cd = await cs.json();
          if (cd.found && Array.isArray(cd.value)) {
            setCustomExercises(cd.value);
            try { localStorage.setItem(CUSTOM_KEY + ":" + userId, JSON.stringify(cd.value)); } catch {}
          }
        }
        // Hutch Touch variation progress syncs via the same per-user store.
        const vs = await fetch(`/api/client/store?key=${encodeURIComponent(VARIATION_KEY)}`);
        if (!vs.ok) throw new Error("Unable to load variation progress");
        if (vs.ok) {
          const vd = await vs.json();
          if (vd.found && vd.value && typeof vd.value === "object") {
            const v = vd.value;
            const next = { bench: v.bench || 0, squat: v.squat || 0, deadlift: v.deadlift || 0 };
            setVariations(next);
            try { localStorage.setItem(VARIATION_KEY + ":" + userId, JSON.stringify(next)); } catch {}
          }
        }
        cloudReady.current = true;
        setTrackerReady(true);
      } catch {
        setSaveError("Could not load your account data. Your draft is kept on this device. Reload to retry.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cloudReady = useRef(false);
  // Report success only after the account confirms the write.
  async function pushTracker(nextWorkouts: Workout[], nextTemplates: Template[]) {
    if (!cloudReady.current) throw new Error("Your account data is still loading. Please retry once it loads.");
    const res = await fetch("/api/client/tracker", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workouts: nextWorkouts, templates: nextTemplates }),
    });
    if (!res.ok) throw new Error("Could not save to your account. Your session is still here; please retry.");
    emitCloudSaved();
  }

  async function runSave(action: () => Promise<void>) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try { await action(); }
    catch (error) { setSaveError(error instanceof Error ? error.message : "Could not save. Please retry."); }
    finally { savingRef.current = false; setSaving(false); }
  }

  useEffect(() => {
    if (!draftReady) return;
    try {
      if (!session.length) localStorage.removeItem(draftKey);
      else localStorage.setItem(draftKey, JSON.stringify({ session, title: sessionTitle, date: sessionDate,
        notes: sessionNotes, hutchId: loadedHutchId, readiness: loadedReadiness,
        templateId: currentTemplateId, workoutId: draftWorkoutId.current }));
    } catch { setSaveError("Device storage is unavailable. Keep this page open until your workout is saved to your account."); }
  }, [draftReady, draftKey, session, sessionTitle, sessionDate, sessionNotes, loadedHutchId, loadedReadiness, currentTemplateId]);

  useEffect(() => {
    if (session.length) focusSession.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [session.length > 0]);

  function canReplaceSession() {
    return !savingRef.current && (!session.length || window.confirm("Replace the current workout draft? Your unsaved entries will be removed."));
  }

  const library: Exercise[] = useMemo(
    () => [...customExercises, ...ALL_EXERCISES],
    [customExercises]
  );

  // Next-session nudge: find the last Hutch Touch session logged and suggest the
  // next one in the rotation (push -> lower-pull -> upper-pull -> legs -> ...).
  const nextHutch = useMemo(() => {
    let lastId: HutchTouchSessionId | null = null;
    for (const w of workouts) {
      const found = hutchTouchSessions.find((s) => w.title.startsWith(`The Hutch Touch — ${s.title}`));
      if (found) {
        lastId = found.id;
        break;
      }
    }
    const nextId = lastId
      ? HUTCH_ORDER[(HUTCH_ORDER.indexOf(lastId) + 1) % HUTCH_ORDER.length]
      : "push";
    const next = hutchTouchSessions.find((s) => s.id === nextId)!;
    const last = lastId ? hutchTouchSessions.find((s) => s.id === lastId) || null : null;
    return { last, next };
  }, [workouts]);

  async function persistWorkouts(list: Workout[]) {
    await pushTracker(list, templates);
    setWorkouts(list);
    try { localStorage.setItem(WORKOUT_KEY + ":" + userId, JSON.stringify(list)); } catch {}

  }
  function persistCustom(list: Exercise[]) {
    setCustomExercises(list);
    try { localStorage.setItem(CUSTOM_KEY + ":" + userId, JSON.stringify(list)); } catch {}
    cloudSet(CUSTOM_KEY, list);
  }
  async function persistTemplates(list: Template[]) {
    await pushTracker(workouts, list);
    setTemplates(list);
    try { localStorage.setItem(TEMPLATE_KEY + ":" + userId, JSON.stringify(list)); } catch {}

  }
  function persistVariations(next: VarState) {
    setVariations(next);
    try { localStorage.setItem(VARIATION_KEY + ":" + userId, JSON.stringify(next)); } catch {}
    cloudSet(VARIATION_KEY, next);
  }

  const activeSplit = SPLITS.find((s) => s.id === activeSplitId) || null;

  // Ready-made workouts for each split. Clicking a split loads these straight
  // into the builder with a sensible set/rep scheme — weight left blank.
  const PREMADE: Record<string, { name: string; sets: number; reps: string }[]> = {
    push: [
      { name: "Bench Press", sets: 4, reps: "6-8" },
      { name: "Overhead Press", sets: 3, reps: "8-10" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "8-12" },
      { name: "Weighted Dips", sets: 3, reps: "8-12" },
      { name: "Lateral Raise", sets: 3, reps: "12-20" },
      { name: "Triceps Pushdown", sets: 3, reps: "10-15" },
    ],
    pull: [
      { name: "Deadlift", sets: 3, reps: "3-5" },
      { name: "Barbell Row", sets: 4, reps: "6-10" },
      { name: "Pull-Up", sets: 3, reps: "6-12" },
      { name: "Lat Pulldown", sets: 3, reps: "10-12" },
      { name: "Face Pull", sets: 3, reps: "15-20" },
      { name: "Bicep Curl", sets: 3, reps: "10-15" },
    ],
    legs: [
      { name: "Back Squat", sets: 4, reps: "5-8" },
      { name: "Romanian Deadlift", sets: 3, reps: "8-10" },
      { name: "Leg Press", sets: 3, reps: "10-15" },
      { name: "Walking Lunge", sets: 3, reps: "10-12" },
      { name: "Leg Curl", sets: 3, reps: "10-15" },
      { name: "Calf Raise", sets: 4, reps: "12-20" },
    ],
    upper: [
      { name: "Bench Press", sets: 4, reps: "6-8" },
      { name: "Barbell Row", sets: 4, reps: "6-10" },
      { name: "Overhead Press", sets: 3, reps: "8-10" },
      { name: "Pull-Up", sets: 3, reps: "6-12" },
      { name: "Lateral Raise", sets: 3, reps: "12-20" },
      { name: "Bicep Curl", sets: 3, reps: "10-15" },
      { name: "Triceps Pushdown", sets: 3, reps: "10-15" },
    ],
    lower: [
      { name: "Back Squat", sets: 4, reps: "5-8" },
      { name: "Romanian Deadlift", sets: 3, reps: "8-10" },
      { name: "Bulgarian Split Squat", sets: 3, reps: "8-12" },
      { name: "Leg Press", sets: 3, reps: "10-15" },
      { name: "Leg Curl", sets: 3, reps: "10-15" },
      { name: "Calf Raise", sets: 4, reps: "12-20" },
    ],
    fullbody: [
      { name: "Back Squat", sets: 3, reps: "5-8" },
      { name: "Bench Press", sets: 3, reps: "6-8" },
      { name: "Deadlift", sets: 3, reps: "3-5" },
      { name: "Overhead Press", sets: 3, reps: "8-10" },
      { name: "Barbell Row", sets: 3, reps: "8-10" },
      { name: "Plank", sets: 3, reps: "30-60s" },
    ],
  };

  function openLibraryForSplit(splitId: string) {
    if (!canReplaceSession()) return;
    draftWorkoutId.current = uid();
    setLoadedHutchId(null);
    setLoadedReadiness("green");
    const preset = PREMADE[splitId];
    if (preset) {
      // Load a ready-made workout for this split straight into the builder.
      const split = SPLITS.find((s) => s.id === splitId);
      const loaded: SessionExercise[] = preset.map((ex) => ({
        id: uid(),
        name: ex.name,
        cue: "",
        sets: Array.from({ length: ex.sets }, () => ({ id: uid(), weight: "", reps: ex.reps, rpe: "" })),
      }));
      setSession(loaded);
      setSessionTitle(split?.name ? `${split.name} Day` : "Workout");
      setSessionNotes("");
      setSessionDate(localWorkoutDate());
      setCurrentTemplateId(null);
      setActiveSplitId(splitId);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Custom (or any split without a preset): open the blank library builder.
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

  async function saveWorkout() {
    const clean = session
      .filter((e) => e.name.trim() || e.sets.some((st) => st.weight || st.reps))
      .map((e) => ({ ...e, sets: e.sets.filter(isCompletedSet) }))
      .filter((e) => e.sets.length > 0);
    if (clean.length === 0) throw new Error("Enter completed reps or time before saving. Replace target ranges such as 6–8 with the reps you performed.");
    if (clean.some((e) => !e.name.trim())) throw new Error("Give each logged exercise a name before saving.");
    // Detect estimated-1RM PRs: a lift the athlete has done before and just beat.
    const priorBest: Record<string, number> = {};
    for (const pw of workouts) {
      for (const ex of pw.exercises) {
        const e = bestStrengthEstimate(ex.name, ex.sets);
        const k = ex.name.trim().toLowerCase();
        if (e > (priorBest[k] || 0)) priorBest[k] = e;
      }
    }
    const prs: { name: string; e1rm: number; prev: number }[] = [];
    for (const ex of clean) {
      const k = ex.name.trim().toLowerCase();
      const e = bestStrengthEstimate(ex.name, ex.sets);
      if (e > 0 && priorBest[k] > 0 && e > priorBest[k]) {
        prs.push({ name: ex.name.trim(), e1rm: e, prev: priorBest[k] });
      }
    }
    const w: Workout = {
      id: draftWorkoutId.current,
      date: sessionDate || localWorkoutDate(),
      title: sessionTitle || (activeSplit?.name ?? "Workout"),
      notes: sessionNotes,
      exercises: clean,
    };
    const nextWorkouts = [w, ...workouts.filter((old) => old.id !== w.id)];
    const nextTemplates = currentTemplateId ? templates.map((t) => t.id === currentTemplateId
      ? { ...t, exercises: cloneExercises(clean) } : t) : templates;
    await pushTracker(nextWorkouts, nextTemplates);
    setWorkouts(nextWorkouts);
    setTemplates(nextTemplates);
    const completedProgram = allPrograms.find((program) => program.sessions?.some((programSession: any) => w.title.startsWith(`${program.name} — ${programSession.title}`)));
    if (completedProgram) {
      const following = nextMemberSession(completedProgram, nextWorkouts);
      if (following) setNextSessionAfterSave({
        title: following.title,
        href: `/clients/workout-log?program=${encodeURIComponent(completedProgram.id)}&session=${encodeURIComponent(following.id)}`,
      });
    } else {
      setNextSessionAfterSave(null);
    }
    // Award XP for logging a workout (server dedupes by workout id).
    fetch("/api/gamification/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutId: w.id }),
    }).catch(() => {});
    // main lift, advance that lift to the next variation for next time.
    if (loadedHutchId) {
      const ml = HUTCH_MAIN_LIFT[loadedHutchId];
      const sess = hutchTouchSessions.find((x) => x.id === loadedHutchId);
      const titleMatches = !!sess && w.title.startsWith(`The Hutch Touch — ${sess.title}`);
      // Light / technique days don't count as completing the prescribed work, so
      // they don't advance the variation.
      if (ml && titleMatches && loadedReadiness !== "light") {
        const idx = (variations[ml.key] || 0) % ml.progression.length;
        const curName = ml.progression[idx].variation.trim().toLowerCase();
        const didLift = clean.some((e) => e.name.trim().toLowerCase() === curName);
        if (didLift) {
          persistVariations({ ...variations, [ml.key]: (idx + 1) % ml.progression.length });
        }
      }
      setLoadedHutchId(null);
    }
    draftWorkoutId.current = uid();
    stopRest();
    setSession([]);
    setSessionTitle("");
    setSessionNotes("");
    setSessionDate("");
    setActiveSplitId(null);
    setCurrentTemplateId(null);
    if (prs.length) setPrCelebration(prs);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  async function deleteWorkout(id: string) {
    if (!window.confirm("Delete this saved workout? This cannot be undone.")) return;
    await persistWorkouts(workouts.filter((w) => w.id !== id));
  }

  // ---- Templates: save the current session (with values) so it can be
  // reused next week with everything prefilled. Values entered carry over. ----
  function cloneExercises(list: SessionExercise[]): SessionExercise[] {
    return list.map((ex) => ({
      id: uid(),
      name: ex.name,
      cue: ex.cue,
      sets: ex.sets.map((st) => ({ id: uid(), weight: st.weight, reps: st.reps, rpe: st.rpe })),
    }));
  }

  async function saveAsTemplate() {
    const clean = session.filter((e) => e.name.trim());
    if (clean.length === 0) return;
    const name = sessionTitle.trim() || activeSplit?.name || "My Template";
    const exercises = cloneExercises(clean);
    if (currentTemplateId) {
      await persistTemplates(
        templates.map((t) => (t.id === currentTemplateId ? { ...t, name, exercises } : t))
      );
    } else {
      const id = uid();
      await persistTemplates([{ id, name, exercises }, ...templates]);
      setCurrentTemplateId(id);
    }
    setTemplateFlash(true);
    setTimeout(() => setTemplateFlash(false), 2500);
  }

  // Load a template into the builder with its saved values prefilled.
  function useTemplate(t: Template) {
    if (!canReplaceSession()) return;
    draftWorkoutId.current = uid();
    setLoadedHutchId(null);
    setLoadedReadiness("green");
    setSession(cloneExercises(t.exercises));
    setSessionTitle(t.name);
    setSessionNotes("");
    setSessionDate(localWorkoutDate());
    setCurrentTemplateId(t.id);
    setActiveSplitId(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm("Delete this template? Saved workouts will stay in your history.")) return;
    await persistTemplates(templates.filter((t) => t.id !== id));
    if (currentTemplateId === id) setCurrentTemplateId(null);
  }

  // Load a previously saved workout into the builder (values included) so it
  // can be reused / turned into a template — handy if they forgot to save one.
  function loadWorkoutAsTemplate(w: Workout) {
    if (!canReplaceSession()) return;
    draftWorkoutId.current = uid();
    setLoadedHutchId(null);
    setLoadedReadiness("green");
    setSession(cloneExercises(w.exercises));
    setSessionTitle(w.title || "");
    setSessionNotes("");
    setSessionDate(localWorkoutDate());
    setCurrentTemplateId(null);
    setActiveSplitId(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const setCell =
    "bg-ink/40 border border-bone/20 px-2 py-1.5 text-bone text-center focus:border-electric outline-none w-full min-w-0";

  return (
    <fieldset disabled={saving} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 pb-28">
      <div aria-live="polite">
        {!trackerReady && !saveError && <p className="text-bone/60">Loading your saved workouts…</p>}
        {saving && <p className="text-electric">Saving to your account…</p>}
        {saveError && <div role="alert" className="border border-rose-400/50 p-4 text-rose-200">{saveError}</div>}
          {savedFlash && (
            <div className="mt-3 border border-electric/40 bg-electric/5 p-3">
              <p className="font-display uppercase tracking-wider text-sm text-electric">✓ Workout saved to your account.</p>
              {nextSessionAfterSave && <a href={nextSessionAfterSave.href} className="mt-2 inline-block font-display uppercase tracking-wider text-[11px] text-bone hover:text-electric">Next: {nextSessionAfterSave.title} →</a>}
            </div>
          )}
          {templateFlash && (
            <p className="mt-3 font-display uppercase tracking-wider text-sm text-electric">
              ✓ Template saved — reuse it any time below.
            </p>
          )}
      </div>
      {prCelebration.length > 0 && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 backdrop-blur-sm p-6" onClick={() => setPrCelebration([])}>
          <div className="relative border-2 border-electric bg-[#0c0630] p-8 max-w-sm w-full text-center shadow-2xl shadow-electric/30" onClick={(e) => e.stopPropagation()}>
            <p className="text-5xl mb-2">🎉</p>
            <p className="glow font-display uppercase tracking-[0.2em] text-electric text-2xl">New PR!</p>
            <p className="text-bone/60 text-sm mt-1 mb-4">You beat your best estimated 1-rep max.</p>
            <div className="grid gap-2">
              {prCelebration.map((p) => (
                <div key={p.name} className="border border-electric/40 bg-electric/5 py-3">
                  <p className="font-display uppercase tracking-wider text-bone">{p.name}</p>
                  <p className="font-display text-3xl text-electric">{p.e1rm} <span className="text-base text-bone/50">lb</span></p>
                  <p className="text-[11px] uppercase tracking-wider text-bone/50">was {p.prev} lb · +{p.e1rm - p.prev} lb</p>
                </div>
              ))}
            </div>
            <button onClick={() => setPrCelebration([])} className="mt-5 font-display uppercase tracking-wider text-sm bg-electric text-ink px-6 py-2.5 hover:bg-bone transition-colors">
              Let&apos;s go
            </button>
          </div>
        </div>
      )}
      {/* YOUR TEMPLATES */}
      {templates.length > 0 && (
        <div>
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-1">
            Your Templates
          </p>
          <p className="text-bone/50 text-xs mb-4">
            Tap a template to load it — your last weights &amp; reps come with it. Just update this week&apos;s numbers and save.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className={
                  "flex items-center justify-between gap-2 border p-3 bg-ink/30 transition-colors " +
                  (currentTemplateId === t.id ? "border-electric" : "border-bone/15 hover:border-electric/60")
                }
              >
                <button onClick={() => useTemplate(t)} className="flex-1 text-left min-w-0">
                  <span className="block font-display uppercase tracking-wider text-bone text-sm truncate">
                    {t.name}
                  </span>
                  <span className="block text-bone/50 text-xs">
                    {t.exercises.length} exercise{t.exercises.length === 1 ? "" : "s"} · tap to load
                  </span>
                </button>
                <button
                  onClick={() => runSave(() => deleteTemplate(t.id))} disabled={saving || !trackerReady} aria-label={`Delete template ${t.name}`}
                  title="Delete template"
                  className="text-bone/40 hover:text-electric text-sm shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPLIT SELECTOR */}
      <div>
        {/* Load The Hutch Touch program */}
        <div className="mt-5 border-2 border-electric/40 bg-electric/5 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-display uppercase tracking-wider text-electric text-sm">
                The Hutch Touch
              </p>
              <p className="text-xs text-bone/60 mt-1 leading-relaxed">
                Load any of the 4 rotation sessions from the performance program straight
                into the tracker — the full warm-up plus every exercise, pre-filled with
                sets, reps &amp; RPE, ready to log.
              </p>
            </div>
            <button
              onClick={() => { setHtSession(nextHutch.next.id); setHutchOpen(true); }}
              className="border-2 border-electric text-electric px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-electric hover:text-ink transition-colors whitespace-nowrap"
            >
              Choose a Session →
            </button>
          </div>

          {/* Next-up nudge — where you are in the rotation */}
          <div className="mt-3 border-t border-electric/20 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-bone/70 leading-relaxed">
              {nextHutch.last ? (
                <>Last logged: <span className="text-bone/90">{nextHutch.last.title}</span>. </>
              ) : (
                <>You haven&apos;t logged a Hutch Touch session yet. </>
              )}
              <span className="text-electric font-display uppercase tracking-wider">Next up:</span>{" "}
              <span className="text-bone/90">{nextHutch.next.title}</span>
            </p>
            <button
              onClick={() => promptReadiness(nextHutch.next.id)}
              className="bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors whitespace-nowrap"
            >
              Load {nextHutch.next.title} →
            </button>
          </div>
        </div>

        <section className="mt-5 border border-bone/20 bg-ink/10 p-4" aria-labelledby="start-workout-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p id="start-workout-title" className="glow font-display uppercase tracking-[0.22em] text-electric text-sm">
              Start a workout
            </p>
            <p className="text-xs text-bone/50">Choose a split and your tracker opens immediately.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SPLITS.map((s) => (
              <button
                key={s.id}
                onClick={() => openLibraryForSplit(s.id)}
                className={
                  "min-h-[116px] text-left p-4 transition-colors " +
                  (s.custom
                    ? "border-2 border-dashed border-bone/30 hover:border-electric bg-transparent"
                    : "border border-bone/15 hover:border-electric bg-ink/30")
                }
              >
                <p className="font-display uppercase tracking-wider text-bone font-600">{s.name}</p>
                <p className="text-xs text-bone/50 mt-1">{s.subtitle}</p>
                {!s.custom && (
                  <p className="text-[10px] uppercase tracking-wider text-electric mt-2">
                    Open tracker →
                  </p>
                )}
              </button>
            ))}
          </div>
          {allPrograms.length > 0 && (
            <div className="mt-5 border-t border-bone/10 pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display uppercase tracking-[0.18em] text-sm text-bone/80">Your programs</p>
                <a href="/clients/my-programs" className="font-display uppercase tracking-wider text-[10px] text-electric hover:text-bone">Browse all →</a>
              </div>
              <p className="mt-1 text-xs text-bone/50">Each option loads the next session directly into your tracker.</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {allPrograms.map((program) => {
                  const next = nextMemberSession(program);
                  return (
                    <button
                      key={program.id}
                      onClick={() => loadMemberSession(program.id, next.id)}
                      className="min-h-[116px] border border-bone/15 bg-ink/30 p-4 text-left transition-colors hover:border-electric"
                    >
                      <p className="font-display uppercase tracking-wider text-bone font-600 line-clamp-2">{program.name}</p>
                      <p className="mt-1 text-xs text-bone/50 line-clamp-2">Next: {next.title}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-electric">Open tracker →</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Repeat last session — one tap to reload your most recent workout */}
        {workouts.length > 0 && (
          <div className="mt-5 border border-bone/20 bg-ink/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-display uppercase tracking-wider text-bone/80 text-sm">Repeat last session</p>
              <p className="text-xs text-bone/60 mt-1 leading-relaxed">
                Reload <span className="text-bone/90">{workouts[0].title || "your last workout"}</span>
                {workouts[0].date ? <span className="text-bone/50"> ({workouts[0].date})</span> : null} into the builder — same
                exercises &amp; sets, ready to log again.
              </p>
            </div>
            <button
              onClick={() => loadWorkoutAsTemplate(workouts[0])}
              className="border-2 border-bone/40 text-bone px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:border-electric hover:text-electric transition-colors whitespace-nowrap"
            >
              ↻ Repeat last session
            </button>
          </div>
        )}

        {/* Main-lift variation order — a list to follow on which variation, and in what order */}
        <div className="mt-3 border border-bone/15 bg-ink/20">
          <button
            onClick={() => setVariationsOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left"
            aria-expanded={variationsOpen}
          >
            <span>
              <span className="font-display uppercase tracking-wider text-bone text-sm block">
                Main-lift variation order
              </span>
              <span className="text-xs text-bone/50 mt-0.5 block">
                Which bench / squat / deadlift variation to run, and in what order — work top to bottom, then repeat.
              </span>
            </span>
            <span className="font-display text-electric text-xl shrink-0">{variationsOpen ? "−" : "+"}</span>
          </button>

          {variationsOpen && (
            <div className="px-4 pb-4 grid md:grid-cols-3 gap-4 border-t border-bone/10 pt-4">
              <VariationList title="Bench (Push day)" steps={HUTCH_TOUCH_BENCH_PROGRESSION} />
              <VariationList title="Squat (Legs day)" steps={HUTCH_TOUCH_SQUAT_ROTATION} />
              <VariationList title="Secondary deadlift / hinge (Pull day)" steps={HUTCH_TOUCH_DEADLIFT_ROTATION} />
              <p className="md:col-span-3 text-[11px] text-bone/50 leading-relaxed border-l-2 border-electric/40 pl-3">
                Sumo deadlift stays your constant anchor on Lower Pull day — it&apos;s the secondary hinge that
                rotates through the list above. Whenever the variation changes, recalibrate your load to hit the
                prescribed RPE — don&apos;t just copy the previous weight.
              </p>
            </div>
          )}
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
              Pick a session
            </p>
            <div className="grid gap-2 mb-5">
              {hutchTouchSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setHtSession(s.id)}
                  className={
                    "px-4 py-3 font-display uppercase tracking-wider text-sm transition-colors text-left " +
                    (htSession === s.id
                      ? "bg-electric text-ink"
                      : "border border-bone/20 text-bone/60 hover:border-electric hover:text-electric")
                  }
                >
                  {s.number}. {s.title}
                  <span className="block text-[10px] tracking-wide opacity-80 normal-case">
                    Primary: {s.focus} · {s.warmup.length} warm-ups + {s.exercises.length} exercises
                  </span>
                  {(() => {
                    const ml = HUTCH_MAIN_LIFT[s.id];
                    if (!ml) return null;
                    const idx = (variations[ml.key] || 0) % ml.progression.length;
                    return (
                      <span
                        className={
                          "block text-[10px] tracking-wide normal-case mt-0.5 " +
                          (htSession === s.id ? "text-ink/80" : "text-electric")
                        }
                      >
                        Main lift this time: {ml.progression[idx].variation} ({idx + 1}/{ml.progression.length})
                      </span>
                    );
                  })()}
                </button>
              ))}
            </div>

            <div className="text-xs text-bone/50 mb-4 leading-relaxed border-l-2 border-electric/40 pl-3">
              Runs as a continuous rotation — there&apos;s no fixed weekday. When you finish
              this session, move to the next one once you&apos;re recovered.
            </div>

            <div className="text-[11px] text-bone/50 mb-5 leading-relaxed border border-bone/15 bg-ink/40 p-3">
              <span className="font-display uppercase tracking-wider text-electric">Recovery check:</span>{" "}
              If the target muscles are still significantly sore, your performance is clearly
              down, or you can&apos;t hold technique — reduce the load or move on to the next
              session instead of grinding.
            </div>

            <button
              onClick={() => promptReadiness(htSession)}
              className="w-full bg-electric text-ink py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
            >
              Load {hutchTouchSessions.find((x) => x.id === htSession)?.title} →
            </button>
          </div>
        </div>
      )}

      {/* READINESS CHECK MODAL */}
      {readinessFor && (() => {
        const sess = hutchTouchSessions.find((x) => x.id === readinessFor);
        if (!sess) return null;
        const nextAfterId = HUTCH_ORDER[(HUTCH_ORDER.indexOf(readinessFor) + 1) % HUTCH_ORDER.length];
        const nextAfter = hutchTouchSessions.find((x) => x.id === nextAfterId);
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-label="Workout readiness" className="relative w-full max-w-md max-h-[85dvh] overflow-y-auto bg-[#0a0420] border-2 border-electric p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="glow font-display uppercase tracking-wider text-electric">Readiness check</p>
                <button onClick={() => setReadinessFor(null)} aria-label="Close readiness check" className="text-bone/60 hover:text-electric text-xl">✕</button>
              </div>
              <p className="text-sm text-bone/70 mb-5 leading-relaxed">
                Before <span className="text-bone/90">{sess.title}</span> — how recovered are the muscles you&apos;re
                about to train?
              </p>

              <div className="grid gap-3">
                {/* GREEN */}
                <button
                  onClick={() => loadHutchTouchSession(readinessFor, "green")}
                  className="text-left border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors p-4"
                >
                  <span className="flex items-center gap-2 font-display uppercase tracking-wider text-sm text-emerald-300">
                    <span className="h-3 w-3 rounded-full bg-emerald-400" /> Green — fresh &amp; recovered
                  </span>
                  <span className="block text-xs text-bone/60 mt-1 leading-relaxed">
                    Load as prescribed and push your working sets to the target RPE.
                  </span>
                </button>

                {/* YELLOW */}
                <button
                  onClick={() => loadHutchTouchSession(readinessFor, "yellow")}
                  className="text-left border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 transition-colors p-4"
                >
                  <span className="flex items-center gap-2 font-display uppercase tracking-wider text-sm text-amber-300">
                    <span className="h-3 w-3 rounded-full bg-amber-400" /> Yellow — a bit sore / average
                  </span>
                  <span className="block text-xs text-bone/60 mt-1 leading-relaxed">
                    Keep the session but back the load off ~10% and stay ~1 RPE shy. Quality over grinding.
                  </span>
                </button>

                {/* RED */}
                <div className="border border-red-500/40 bg-red-500/10 p-4">
                  <span className="flex items-center gap-2 font-display uppercase tracking-wider text-sm text-red-300">
                    <span className="h-3 w-3 rounded-full bg-red-500" /> Red — very sore / run down
                  </span>
                  <span className="block text-xs text-bone/60 mt-1 mb-3 leading-relaxed">
                    Don&apos;t grind it. Move to the next session, or keep today light and technical.
                  </span>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => loadHutchTouchSession(nextAfterId, "green")}
                      className="bg-electric text-ink px-3 py-2 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors"
                    >
                      Skip to {nextAfter?.title} →
                    </button>
                    <button
                      onClick={() => loadHutchTouchSession(readinessFor, "light")}
                      className="border border-bone/30 text-bone/80 px-3 py-2 font-display uppercase tracking-wider text-xs hover:border-bone hover:text-bone transition-colors"
                    >
                      Train light today
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {session.length > 0 && (
        <div ref={focusSession} className="border-t border-bone/15 pt-8 scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <p className="glow font-display uppercase tracking-[0.3em] text-bone/70 text-sm">
              Active Session
            </p>
            <button
              onClick={() => { if (canReplaceSession()) { setSession([]); setLoadedHutchId(null); stopRest(); } }}
              className="font-display uppercase tracking-wider text-xs text-bone/40 hover:text-electric"
            >
              Clear
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <input
              aria-label="Session title"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder={activeSplit?.name ? `${activeSplit.name} — Session` : "Session title"}
              className="bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none"
            />
            <input
              type="date" aria-label="Workout date" max={localWorkoutDate()}
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              placeholder={localWorkoutDate()}
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
                    className="bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none flex-1 min-w-0"
                  />
                  <button onClick={() => removeExercise(ex.id)} className="text-bone/40 hover:text-electric">
                    ✕
                  </button>
                </div>
                {ex.cue && (
                  <p className="text-xs text-bone/80 mb-3 border-l-2 border-electric/50 pl-2.5 py-0.5 leading-relaxed">
                    {ex.cue}
                  </p>
                )}
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setHelpOpenId(helpOpenId === ex.id ? null : ex.id)}
                    aria-expanded={helpOpenId === ex.id}
                    className="font-display uppercase tracking-wider text-[11px] text-electric hover:text-bone"
                  >
                    {helpOpenId === ex.id ? "Hide exercise help" : "Need help with this exercise?"}
                  </button>
                  {helpOpenId === ex.id && (() => {
                    const guide = findExerciseGuide(ex.name);
                    const swaps = swapCandidates(ex.name);
                    const exerciseKey = normaliseExerciseName(ex.name);
                    const matchingDemo = helpVideos.find((video) => {
                      const title = normaliseExerciseName(video.title);
                      return title.includes(exerciseKey) || exerciseKey.includes(title);
                    });
                    const message = `Can you help me with ${ex.name}? I need a technique check or exercise swap.`;
                    const coachHref = (() => {
                      const params = new URLSearchParams({
                        message,
                        context: "workout",
                        topic: `Technique check: ${ex.name}`,
                        details: [sessionTitle && `Session: ${sessionTitle}`, ex.cue && `Prescription: ${ex.cue}`].filter(Boolean).join(" · "),
                      });
                      return `/clients?${params.toString()}#coaching`;
                    })();
                    return (
                      <div className="mt-2 border border-electric/30 bg-electric/5 p-3 text-xs leading-relaxed">
                        {guide ? (
                          <>
                            <p className="font-display uppercase tracking-wider text-electric text-[10px]">Quick technique cue</p>
                            <p className="mt-1 text-bone/80">{guide.howTo[0]}</p>
                            {guide.mistakes[0] && <p className="mt-2 text-bone/60"><span className="text-electric">Watch for:</span> {guide.mistakes[0]}</p>}
                          </>
                        ) : (
                          <p className="text-bone/70">Use a controlled range of motion and stop if an exercise causes sharp pain. Open the full library for movement-specific cues.</p>
                        )}
                        {matchingDemo && (
                          <div className="mt-3 border-t border-electric/20 pt-3">
                            <p className="font-display uppercase tracking-wider text-electric text-[10px] mb-2">Coach demo: {matchingDemo.title}</p>
                            <video src={matchingDemo.url} controls className="w-full max-h-56 rounded bg-black" preload="metadata" />
                          </div>
                        )}
                        {swaps.length > 0 && (
                          <div className="mt-3 border-t border-electric/20 pt-2">
                            <p className="font-display uppercase tracking-wider text-[10px] text-bone/60">Swap this exercise</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {swaps.map((swap) => <button key={swap.id} type="button" onClick={() => useSwap(ex.id, swap)} className="border border-bone/30 px-2.5 py-1.5 text-[10px] font-display uppercase tracking-wider text-bone/80 hover:border-electric hover:text-electric">{swap.name}</button>)}
                            </div>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-3">
                          <a href={`/clients/workout-log?tab=exercises&search=${encodeURIComponent(ex.name)}`} className="font-display uppercase tracking-wider text-[10px] text-electric hover:text-bone">Open full guide →</a>
                          <a href={coachingClient ? coachHref : "/forum"} className="font-display uppercase tracking-wider text-[10px] text-electric hover:text-bone">{coachingClient ? "Ask your coach →" : "Ask the community →"}</a>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-[28px_1fr_1fr_1fr_24px] gap-2 items-center text-[10px] uppercase tracking-wider text-bone/50 mb-1">
                  <span>Set</span>
                  <span className="text-center">Weight (lb)</span>
                  <span className="text-center">Reps / time</span>
                  <span className="text-center">RPE</span>
                  <span />
                </div>
                <div className="grid gap-2">
                  {ex.sets.map((st, si) => (
                    <div key={st.id} className="grid grid-cols-[28px_1fr_1fr_1fr_24px] gap-2 items-center">
                      <span className="font-display text-bone/60 text-sm text-center">{si + 1}</span>
                      <input aria-label={`${ex.name} set ${si + 1} weight in pounds`} inputMode="decimal" value={st.weight} onChange={(e) => updateSet(ex.id, st.id, "weight", e.target.value)} placeholder="—" className={setCell} />
                      <input aria-label={`${ex.name} set ${si + 1} repetitions or time`} value={st.reps} onChange={(e) => updateSet(ex.id, st.id, "reps", e.target.value)} placeholder="—" className={setCell} />
                      <input aria-label={`${ex.name} set ${si + 1} RPE`} inputMode="decimal" value={st.rpe} onChange={(e) => updateSet(ex.id, st.id, "rpe", e.target.value)} placeholder="—" className={setCell} />
                      {ex.sets.length > 1 ? (
                        <button onClick={() => removeSet(ex.id, st.id)} className="text-bone/40 hover:text-electric text-sm">✕</button>
                      ) : <span />}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 flex-wrap">
                  <button onClick={() => addSet(ex.id)} className="font-display uppercase tracking-wider text-xs text-electric hover:text-bone">
                    + Add Set
                  </button>
                  <button
                    onClick={() => startRest()}
                    title={`Start a ${restDuration}s rest timer`}
                    className="font-display uppercase tracking-wider text-xs text-bone/50 hover:text-electric"
                  >
                    ⏱ Rest {restDuration}s
                  </button>
                </div>
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

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => runSave(saveWorkout)} disabled={saving || !trackerReady}
              className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
            >
              Save Workout
            </button>
            <button
              onClick={() => runSave(saveAsTemplate)} disabled={saving || !trackerReady}
              title="Save these exercises as a reusable template — your numbers carry over next time"
              className="border border-electric text-electric px-6 py-3 font-display uppercase tracking-wider hover:bg-electric hover:text-ink transition-colors"
            >
              {currentTemplateId ? "↻ Update Template" : "☆ Save as Template"}
            </button>
          </div>

        </div>
      )}

      {/* FLOATING REST TIMER — available throughout an active session */}
      {(session.length > 0 || restRunning || restLeft > 0) && (
        <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-[70] pointer-events-none">
          <div className="mx-auto max-w-2xl px-3 pb-3 pointer-events-auto">
            <div
              className={
                "border-2 shadow-2xl backdrop-blur-md px-4 py-3 flex items-center gap-3 flex-wrap " +
                (restRunning
                  ? "border-electric bg-electric/15 shadow-electric/30"
                  : restLeft === 0 && restRunning === false && restDuration > 0 && session.length > 0
                  ? "border-bone/20 bg-ink/90"
                  : "border-bone/20 bg-ink/90")
              }
            >
              <span className="font-display uppercase tracking-wider text-[11px] text-electric shrink-0">⏱ Rest</span>

              {restRunning || restLeft > 0 ? (
                <>
                  <span className={"font-display text-2xl tabular-nums " + (restLeft <= 5 ? "text-electric animate-pulse" : "text-bone")}>
                    {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button onClick={() => { restDeadline.current += 15000; setRestLeft((n) => n + 15); }} className="border border-bone/25 text-bone/70 px-2.5 py-1.5 text-xs font-display uppercase tracking-wider hover:border-electric hover:text-electric">
                      +15s
                    </button>
                    <button
                      onClick={() => { if (!restRunning) restDeadline.current = Date.now() + restLeft * 1000; setRestRunning((r) => !r); }}
                      className="border border-bone/25 text-bone/70 px-2.5 py-1.5 text-xs font-display uppercase tracking-wider hover:border-electric hover:text-electric"
                    >
                      {restRunning ? "Pause" : "Resume"}
                    </button>
                    <button onClick={stopRest} className="bg-electric text-ink px-3 py-1.5 text-xs font-display uppercase tracking-wider hover:bg-bone">
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {[60, 90, 120, 180].map((s) => (
                    <button
                      key={s}
                      onClick={() => startRest(s)}
                      className="border border-bone/25 text-bone/70 px-3 py-1.5 text-xs font-display uppercase tracking-wider hover:border-electric hover:text-electric"
                    >
                      {s % 60 === 0 ? `${s / 60}m` : `${Math.floor(s / 60)}m ${s % 60}s`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS CHARTS */}
      {(() => {
        // Build per-lift progression (best estimated 1RM per session, chronological).
        const byLift: Record<string, { date: string; e1rm: number; top: number }[]> = {};
        [...workouts].reverse().forEach((w) => {
          w.exercises.forEach((ex) => {
            const e = bestStrengthEstimate(ex.name, ex.sets);
            const top = ex.sets.reduce((m, s) => Math.max(m, parseFloat(s.weight) || 0), 0);
            if (e <= 0) return;
            (byLift[ex.name] ||= []).push({ date: w.date, e1rm: e, top });
          });
        });
        const lifts = Object.keys(byLift).filter((k) => byLift[k].length >= 1).sort();
        if (lifts.length === 0) return null;
        const active = chartLift && byLift[chartLift] ? chartLift : lifts[0];
        const series = byLift[active];
        const max = Math.max(...series.map((p) => p.e1rm));
        const min = Math.min(...series.map((p) => p.e1rm));
        const range = Math.max(1, max - min);
        const W = 640, H = 180, padX = 12, padY = 18;
        const n = series.length;
        const x = (i: number) => (n <= 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1));
        const y = (v: number) => H - padY - ((v - min) / range) * (H - padY * 2);
        const pts = series.map((p, i) => `${x(i)},${y(p.e1rm)}`).join(" ");
        const latest = series[series.length - 1];
        const first = series[0];
        const delta = latest.e1rm - first.e1rm;
        return (
          <div className="border-t border-bone/15 pt-8 mb-2">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-1">
              Progress
            </p>
            <p className="text-bone/50 text-xs mb-4">
              Estimated 1-rep max in pounds (Epley), using completed sets of 1–12 reps. Warm-ups, timed work and rep ranges are excluded.
            </p>
            <select
              aria-label="Exercise for strength progress"
              value={active}
              onChange={(e) => setChartLift(e.target.value)}
              className="mb-4 w-full max-w-full sm:w-auto min-w-0 bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none font-display uppercase tracking-wider text-sm truncate"
            >
              {lifts.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <div className="border border-bone/15 bg-ink/30 p-4">
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <span className="font-display uppercase tracking-wider text-bone text-sm">{active}</span>
                <span className="text-xs text-bone/60">
                  Current <span className="text-electric font-display">~{latest.e1rm} lb</span>
                  {series.length > 1 && (
                    <span className={delta >= 0 ? "text-emerald-400 ml-2" : "text-rose-400 ml-2"}>
                      {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} lb since start
                    </span>
                  )}
                </span>
              </div>
              <svg role="img" aria-label={`${active}: estimated max ${latest.e1rm} pounds, change ${delta} pounds`} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
                <polyline points={pts} fill="none" stroke="#3d8cff" strokeWidth="2.5" />
                {series.map((p, i) => (
                  <g key={i}>
                    <circle cx={x(i)} cy={y(p.e1rm)} r="4" fill="#3d8cff" />
                  </g>
                ))}
              </svg>
              <div className="flex justify-between text-[10px] text-bone/40 mt-1">
                <span>{first.date}</span>
                {series.length > 1 && <span>{latest.date}</span>}
              </div>
            </div>
          </div>
        );
      })()}

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
          <ul className="grid gap-2 max-h-[460px] overflow-y-auto">
            {workouts.map((w) => {
              const open = expandedWorkoutId === w.id;
              return (
                <li key={w.id} className="border border-bone/15 bg-ink/30">
                  <div className="flex items-center">
                    <button
                      onClick={() => setExpandedWorkoutId(open ? null : w.id)}
                      className="flex-1 min-w-0 flex items-center justify-between gap-4 p-4 text-left hover:border-electric transition-colors"
                      aria-expanded={open}
                    >
                      <span className="min-w-0">
                        <span className="block font-display uppercase tracking-wider text-bone truncate">{w.title}</span>
                        <span className="block text-xs text-bone/50">{w.date} · {w.exercises.length} exercise{w.exercises.length === 1 ? "" : "s"}</span>
                      </span>
                      <span className="font-display text-electric text-xl shrink-0">{open ? "−" : "+"}</span>
                    </button>
                    <button
                      onClick={() => runSave(() => deleteWorkout(w.id))} disabled={saving || !trackerReady} aria-label={`Delete ${w.title}`}
                      title="Delete workout"
                      className="px-4 self-stretch text-bone/40 hover:text-electric text-sm border-l border-bone/10"
                    >
                      ✕
                    </button>
                  </div>
                  {open && (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => loadWorkoutAsTemplate(w)}
                        title="Load this workout into the builder to reuse or save as a template"
                        className="mb-3 border border-electric text-electric px-4 py-2 font-display uppercase tracking-wider text-[11px] hover:bg-electric hover:text-ink transition-colors"
                      >
                        ↻ Load &amp; reuse
                      </button>
                      <ul className="grid gap-2">
                        {w.exercises.map((ex) => {
                          const e1 = bestStrengthEstimate(ex.name, ex.sets);
                          return (
                          <li key={ex.id} className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-display uppercase tracking-wider text-bone/80 text-xs">{ex.name}</p>
                              {e1 > 0 && (
                                <span className="font-display uppercase tracking-wider text-[10px] text-electric border border-electric/40 px-1.5 py-0.5 shrink-0">
                                  ~{e1} lb estimated 1RM
                                </span>
                              )}
                            </div>
                            <p className="text-bone/60 text-xs mt-0.5">
                              {ex.sets.map((s) => `${s.weight}×${s.reps}${s.rpe ? ` @${s.rpe}` : ""}`).join("  ·  ")}
                            </p>
                          </li>
                          );
                        })}
                      </ul>
                      {w.notes && <p className="mt-3 text-xs text-bone/50 border-t border-bone/10 pt-2">{w.notes}</p>}
                    </div>
                  )}
                </li>
              );
            })}
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
    </fieldset>
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
