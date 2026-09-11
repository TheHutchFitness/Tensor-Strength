"use client";

import { useEffect, useState } from "react";

type Flag = { type: string; label: string; suggestion?: string };
type Client = {
  id: string;
  username: string;
  email: string;
  adherence: { workoutsLast7: number; workoutTarget: number; workoutPct: number; macroHitRate: number | null; checkinStreak: number };
  lastWorkout: string | null;
  lastCheckin: string | null;
  lastNutrition: string | null;
  avgRpe: number | null;
  latestReadiness: string;
  flags: Flag[];
};

function Ring({ pct, label, sub }: { pct: number | null; label: string; sub?: string }) {
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const color = pct == null ? "#5a6b82" : p >= 80 ? "#33ccff" : p >= 50 ? "#e0b341" : "#e0574b";
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ffffff14" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3.5" strokeDasharray={`${(p / 100) * 97.4} 97.4`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-bone text-sm">{pct == null ? "—" : `${p}%`}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-bone/50 mt-1 text-center">{label}</p>
      {sub && <p className="text-[10px] text-bone/40">{sub}</p>}
    </div>
  );
}

const FLAG_EMOJI: Record<string, string> = {
  no_workout: "🏋️", missed_checkin: "📋", no_nutrition: "🍽️", macros_dropping: "📉", low_readiness: "🔋", high_rpe: "🥵",
};

export default function CoachInsights({ onOpenClient }: { onOpenClient?: (id: string) => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trainer/insights")
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d) => { setClients(d.clients || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-bone/50 font-display uppercase tracking-wider text-sm">Loading insights…</p>;
  if (clients.length === 0) return <p className="text-bone/50 text-sm">No assigned clients yet.</p>;

  const flagged = clients.filter((c) => c.flags.length > 0);

  return (
    <div className="grid gap-8">
      {/* Needs attention */}
      <div>
        <p className="font-display uppercase tracking-wider text-electric text-sm mb-1">Needs attention</p>
        <p className="text-bone/50 text-xs mb-4">Clients who may be slipping — flagged automatically from their training, nutrition and check-in data.</p>
        {flagged.length === 0 ? (
          <div className="border border-electric/30 bg-electric/5 p-5 text-sm text-bone/80">🎉 Everyone&apos;s on track — no flags right now.</div>
        ) : (
          <div className="grid gap-3">
            {flagged.map((c) => (
              <div key={c.id} className="border border-bone/15 bg-ink/30 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <button onClick={() => onOpenClient?.(c.id)} className="font-display uppercase tracking-wider text-bone hover:text-electric transition-colors">
                    {c.username}
                  </button>
                  <span className="text-[10px] uppercase tracking-wider text-bone/40">{c.flags.length} flag{c.flags.length === 1 ? "" : "s"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.flags.map((f, i) => (
                    <span key={i} title={f.suggestion || ""} className="inline-flex items-center gap-1 border border-bone/25 bg-ink/40 text-bone/80 text-xs px-2.5 py-1">
                      <span>{FLAG_EMOJI[f.type] || "⚠️"}</span>{f.label}
                    </span>
                  ))}
                </div>
                {c.flags.some((f) => f.suggestion) && (
                  <div className="mt-2 border-l-2 border-electric/60 pl-3 py-1">
                    {c.flags.filter((f) => f.suggestion).map((f, i) => (
                      <p key={i} className="text-xs text-bone/70">💡 {f.suggestion}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adherence scorecards */}
      <div>
        <p className="font-display uppercase tracking-wider text-electric text-sm mb-4">Adherence scorecard</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="border border-bone/15 bg-ink/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => onOpenClient?.(c.id)} className="font-display uppercase tracking-wider text-bone hover:text-electric transition-colors">{c.username}</button>
                {c.avgRpe != null && (
                  <span className={"text-[10px] uppercase tracking-wider px-2 py-0.5 border " + (c.avgRpe >= 9 ? "border-[#e0574b] text-[#e0574b]" : "border-bone/25 text-bone/50")}>
                    Avg RPE {c.avgRpe}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Ring pct={c.adherence.workoutPct} label="Workouts" sub={`${c.adherence.workoutsLast7}/${c.adherence.workoutTarget} wk`} />
                <Ring pct={c.adherence.macroHitRate} label="Macros" sub="7-day hit" />
                <div className="flex flex-col items-center justify-center">
                  <p className="font-display text-2xl text-electric">{c.adherence.checkinStreak}</p>
                  <p className="text-[10px] uppercase tracking-wider text-bone/50 mt-1 text-center">Check-in streak</p>
                  <p className="text-[10px] text-bone/40">weeks</p>
                </div>
              </div>
              {c.latestReadiness && (
                <p className="mt-3 text-[11px] text-bone/50">Latest readiness: <span className="text-bone/80">{c.latestReadiness}</span></p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
