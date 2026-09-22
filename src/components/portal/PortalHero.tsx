"use client";

import { useEffect, useState } from "react";
import { AVATARS, levelFromXp } from "../../data/gamification";
import { hutchTouchSessions, type HutchTouchSessionId } from "../../data/hutchTouchProgram";
import { memberPrograms } from "../../data/memberPrograms";

const HUTCH_ORDER: HutchTouchSessionId[] = ["push", "lower-pull", "upper-pull", "legs"];

function avatarEmoji(id?: string) {
  return (AVATARS.find((a) => a.id === id) || AVATARS[0]).emoji;
}
function todayPeriod() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

type PortalProgram = {
  id: string;
  name: string;
  length?: string;
  sessions: { id: string; title: string }[];
};

function nextProgramSession(program: PortalProgram, workouts: any[]) {
  const ids = program.sessions.map((session) => session.id);
  let lastId: string | null = null;
  for (const workout of workouts) {
    const found = program.sessions.find((session) => (workout.title || "").startsWith(`${program.name} — ${session.title}`));
    if (found) { lastId = found.id; break; }
  }
  const nextId = lastId ? ids[(ids.indexOf(lastId) + 1) % ids.length] : ids[0];
  return program.sessions.find((session) => session.id === nextId) || program.sessions[0];
}

export default function PortalHero({
  username,
  userId,
  accessType,
  hasCoach = false,
}: {
  username: string;
  userId: string;
  accessType?: string;
  hasCoach?: boolean;
}) {
  const [game, setGame] = useState<any>(null);
  const [trackerLoaded, setTrackerLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [coachPrograms, setCoachPrograms] = useState<PortalProgram[]>([]);
  const [activeProgramId, setActiveProgramId] = useState("");

  useEffect(() => {
    fetch("/api/gamification").then((r) => (r.ok ? r.json() : null)).then(setGame).catch(() => {});
    fetch("/api/client/tracker").then((r) => (r.ok ? r.json() : null)).then((d) => { if (!d) throw new Error(); setWorkouts(d.workouts || []); setTrackerLoaded(true); }).catch(() => setLoadError(true));
    fetch("/api/member/programs").then((r) => (r.ok ? r.json() : null)).then((d) => setCoachPrograms(d?.programs || [])).catch(() => {});
    try { setActiveProgramId(localStorage.getItem(`ts-active-program:${userId}`) || ""); } catch {}
  }, [userId]);

  const level = game ? (game.xp?.level ?? levelFromXp(game.xp?.total || 0)) : null;
  const emoji = avatarEmoji(game?.equippedAvatar);

  const dailyQuest = game?.quests?.find((q: any) => q.id === "daily_log");
  const claimedToday = game?.claims?.daily_log === todayPeriod();

  let nextTitle = "Upper Body Push";
  let lastTitle: string | null = null;
  for (const w of workouts) {
    const found = hutchTouchSessions.find((s) => (w.title || "").startsWith(`The Hutch Touch — ${s.title}`));
    if (found) { lastTitle = found.title; break; }
  }
  const lastId = lastTitle ? hutchTouchSessions.find((s) => s.title === lastTitle)?.id ?? null : null;
  const latestIsHutch = !!workouts[0] && hutchTouchSessions.some((s) => (workouts[0].title || "").startsWith(`The Hutch Touch — ${s.title}`));
  const nextId = lastId ? HUTCH_ORDER[(HUTCH_ORDER.indexOf(lastId) + 1) % HUTCH_ORDER.length] : "push";
  nextTitle = hutchTouchSessions.find((s) => s.id === nextId)?.title || "Upper Body Push";
  const allPrograms: PortalProgram[] = [...memberPrograms, ...coachPrograms];
  const activeProgram = allPrograms.find((program) => program.id === activeProgramId) || null;
  const nextProgram = activeProgram ? nextProgramSession(activeProgram, workouts) : null;
  const coachingClient = hasCoach || accessType === "remote_coaching" || accessType === "in_person";
  const primaryHref = nextProgram
    ? `/clients/workout-log?program=${encodeURIComponent(activeProgram!.id)}&session=${encodeURIComponent(nextProgram.id)}`
    : trackerLoaded && latestIsHutch
      ? `/clients/workout-log?session=${nextId}`
      : "/clients/my-programs";
  const primaryLabel = nextProgram
    ? `Start ${nextProgram.title} →`
    : trackerLoaded && latestIsHutch
      ? "Start next workout →"
      : "Choose a training plan →";

  const xpInto = game?.xp?.into ?? 0;
  const xpNeeded = game?.xp?.needed ?? 0;
  const pct = xpNeeded ? Math.min(100, Math.round((xpInto / xpNeeded) * 100)) : 0;

  return (
    <div className="border-2 border-electric/40 bg-gradient-to-br from-electric/10 to-transparent p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-2">Welcome back</p>
          <h2 className="font-display uppercase text-3xl md:text-4xl font-700 leading-tight text-bone flex items-center gap-3">
            <span className="text-4xl md:text-5xl">{emoji}</span>
            <span>{username || "Athlete"}</span>
          </h2>
          {level != null && (
            <div className="mt-3 max-w-xs">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-bone/60">
                <span className="text-electric font-display">Level {level}</span>
                {xpNeeded ? <span>{xpInto}/{xpNeeded} XP</span> : null}
              </div>
              <div className="mt-1 h-2 w-full bg-bone/10 overflow-hidden rounded">
                <div className="h-full bg-electric transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
        <a href="/quests" className="shrink-0 font-display uppercase tracking-wider text-xs border border-electric text-electric px-4 py-2 hover:bg-electric hover:text-ink transition-colors">
          Quests →
        </a>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          [primaryHref, "Train today"], ["/clients/my-programs", "My plan"],
          [coachingClient ? "/clients?message=I%20need%20help%20with%20my%20training#coaching" : "/clients/workout-log?tab=exercises", coachingClient ? "Ask your coach" : "Exercise help"], ["/clients/progress", "My progress"],
        ].map(([href, label]) => <a key={href} href={href} className="border border-electric/40 px-3 py-3 text-center text-sm text-bone hover:bg-electric/10">{label}</a>)}
      </div>
      <a href="/ai" className="mt-3 block border border-electric/40 px-3 py-3 text-center text-sm text-electric hover:bg-electric/10">
        Tensor AI →
      </a>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <div className="border border-bone/15 bg-ink/30 p-4">
          <p className="text-[10px] uppercase tracking-wider text-bone/50">Today&apos;s quest</p>
          {dailyQuest ? (
            <>
              <p className="font-display uppercase tracking-wider text-bone mt-1">{dailyQuest.title}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-electric font-display">+{dailyQuest.xp} XP</span>
                {claimedToday ? (
                  <span className="text-[11px] uppercase tracking-wider text-electric">✓ Claimed today</span>
                ) : (
                  <a href="/quests" className="text-[11px] uppercase tracking-wider text-bone/60 hover:text-electric">Claim on Quests →</a>
                )}
              </div>
            </>
          ) : (
            <a href="/quests" className="text-sm text-electric mt-1 inline-block">View your quests →</a>
          )}
        </div>

        <div className="border border-bone/15 bg-ink/30 p-4">
          <p className="text-[10px] uppercase tracking-wider text-bone/50">Train today</p>
          <p className="font-display uppercase tracking-wider text-bone mt-1">
            {!trackerLoaded ? (loadError ? "Training plan unavailable" : "Loading your training…") : nextProgram ? nextProgram.title : latestIsHutch ? nextTitle : "Choose your training plan"}
          </p>
          <p className="text-xs text-bone/50 mt-0.5">
            {nextProgram
              ? `${activeProgram?.name}${activeProgram?.length ? ` · ${activeProgram.length}` : ""}`
              : latestIsHutch ? `Last: ${lastTitle}` : "Pick a program once, then come back here to start your next session."}
          </p>
          <a href={primaryHref} className="mt-2 inline-block bg-electric text-ink px-4 py-2 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors">
            {primaryLabel}
          </a>
          {nextProgram && <a href="/clients/my-programs" className="ml-3 text-[11px] uppercase tracking-wider text-electric hover:text-bone">Change plan</a>}
        </div>
      </div>
    </div>
  );
}
