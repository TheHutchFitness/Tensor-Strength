"use client";

import { useEffect, useState } from "react";
import { AVATARS, levelFromXp } from "../../data/gamification";
import { hutchTouchSessions, type HutchTouchSessionId } from "../../data/hutchTouchProgram";

const HUTCH_ORDER: HutchTouchSessionId[] = ["push", "lower-pull", "upper-pull", "legs"];

function avatarEmoji(id?: string) {
  return (AVATARS.find((a) => a.id === id) || AVATARS[0]).emoji;
}
function todayPeriod() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function PortalHero({ username }: { username: string }) {
  const [game, setGame] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/gamification").then((r) => (r.ok ? r.json() : null)).then(setGame).catch(() => {});
    fetch("/api/client/tracker").then((r) => (r.ok ? r.json() : null)).then((d) => setWorkouts(d?.workouts || [])).catch(() => {});
  }, []);

  const level = game ? (game.xp?.level ?? levelFromXp(game.xp?.total || 0)) : null;
  const emoji = avatarEmoji(game?.equippedAvatar);

  // Today's daily quest + claim status
  const dailyQuest = game?.quests?.find((q: any) => q.id === "daily_log");
  const claimedToday = game?.claims?.daily_log === todayPeriod();

  // Next up in the Hutch Touch rotation (from most-recent logged session)
  let nextTitle = "Upper Body Push";
  let lastTitle: string | null = null;
  for (const w of workouts) {
    const found = hutchTouchSessions.find((s) => (w.title || "").startsWith(`The Hutch Touch — ${s.title}`));
    if (found) { lastTitle = found.title; break; }
  }
  const lastId = lastTitle ? hutchTouchSessions.find((s) => s.title === lastTitle)?.id ?? null : null;
  const nextId = lastId ? HUTCH_ORDER[(HUTCH_ORDER.indexOf(lastId) + 1) % HUTCH_ORDER.length] : "push";
  nextTitle = hutchTouchSessions.find((s) => s.id === nextId)?.title || "Upper Body Push";

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

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {/* Today's quest */}
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
            <p className="text-sm text-bone/50 mt-1">Loading…</p>
          )}
        </div>

        {/* Next up session */}
        <div className="border border-bone/15 bg-ink/30 p-4">
          <p className="text-[10px] uppercase tracking-wider text-bone/50">Next up</p>
          <p className="font-display uppercase tracking-wider text-bone mt-1">{nextTitle}</p>
          <p className="text-xs text-bone/50 mt-0.5">
            {lastTitle ? `Last: ${lastTitle}` : "Start your rotation"}
          </p>
          <a href="/clients/workout-log" className="mt-2 inline-block bg-electric text-ink px-4 py-2 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors">
            Go to tracker →
          </a>
        </div>
      </div>
    </div>
  );
}
