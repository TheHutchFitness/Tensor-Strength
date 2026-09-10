"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SiteTabBar from "@/components/SiteTabBar";
import Avatar from "@/components/Avatar";
import { AVATARS, TITLES, titleById, LEVEL_REWARDS } from "@/data/gamification";

type XP = { total: number; level: number; into: number; needed: number; nextLevelAt: number };
type Quest = { id: string; period: string; title: string; desc: string; xp: number; target?: number; metric?: string };
type Game = {
  xp: XP;
  isPaid: boolean;
  goals: string[];
  equippedAvatar: string;
  equippedTitle: string;
  unlocked: { avatars: string[]; titles: string[] };
  claims: Record<string, string>;
  quests: Quest[];
  goalQuests: Quest[];
  customQuests: Quest[];
  streak: number;
  badges: { id: string; name: string; emoji: string; desc: string; xp: number }[];
  earnedBadges: string[];
};

type Workout = { id: string; date?: string; title?: string };

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday-based
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

export default function QuestsPage() {
  const [game, setGame] = useState<Game | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [board, setBoard] = useState<{ username: string; level: number; xp: number; avatar: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [isCoach, setIsCoach] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    const g = await fetch("/api/gamification");
    if (g.status === 401) {
      window.location.href = "/login?from=/quests";
      return;
    }
    const gd = await g.json();
    setGame(gd);
    const me = await fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (me?.user) { setIsCoach(!!me.user.isTrainer || me.user.role === "admin"); setIsAdmin(me.user.role === "admin"); }
    const st = await fetch(`/api/client/store?key=${encodeURIComponent("hutch-workouts")}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (st?.found && Array.isArray(st.value)) setWorkouts(st.value);
    const lb = await fetch("/api/gamification/leaderboard").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (lb?.leaderboard) setBoard(lb.leaderboard);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Compute quest progress from the member's own workouts.
  const metrics = useMemo(() => {
    const now = new Date();
    const sow = startOfWeek(now);
    const som = new Date(now.getFullYear(), now.getMonth(), 1);
    let today = 0, week = 0, month = 0;
    let setsToday = 0, setsThisWeek = 0, setsThisMonth = 0;
    const rotSet = new Set<string>();
    const exWeek = new Set<string>();
    for (const w of workouts) {
      const d = w.date ? new Date(w.date) : null;
      if (!d || isNaN(d.getTime())) continue;
      const exs = ((w as any).exercises || []) as { name?: string; sets?: unknown[] }[];
      const setCount = exs.reduce((s, e) => s + (Array.isArray(e.sets) ? e.sets.length : 0), 0);
      if (d.toDateString() === now.toDateString()) { today++; setsToday += setCount; }
      if (d >= sow) {
        week++; setsThisWeek += setCount;
        if ((w.title || "").startsWith("The Hutch Touch —")) rotSet.add((w.title || "").replace(/\s*\((deload|light)\)$/, ""));
        exs.forEach((e) => e.name && exWeek.add(String(e.name).toLowerCase()));
      }
      if (d >= som) { month++; setsThisMonth += setCount; }
    }
    return {
      workoutsToday: today, workoutsThisWeek: week, workoutsThisMonth: month,
      rotationThisWeek: Math.min(4, rotSet.size),
      setsToday, setsThisWeek, setsThisMonth,
      exercisesThisWeek: exWeek.size,
    } as Record<string, number>;
  }, [workouts]);

  async function claim(q: Quest, done: boolean) {
    if (!done) return;
    const r = await fetch("/api/gamification/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId: q.id }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setMsg(`+${d.gained} XP claimed!`); load(); }
    else setMsg(d.error || "Could not claim");
    setTimeout(() => setMsg(""), 3000);
  }

  async function equip(kind: "avatarId" | "titleId", id: string) {
    const r = await fetch("/api/gamification/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [kind]: id }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) load();
    else { setMsg(d.error || "Locked"); setTimeout(() => setMsg(""), 3000); }
  }

  if (loading || !game) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-ink pt-28 text-center text-bone/60">Loading your quests…</main>
        <SiteTabBar />
      </>
    );
  }

  const pct = Math.min(100, Math.round((game.xp.into / Math.max(1, game.xp.needed)) * 100));
  const periodClaimed = (q: Quest) => {
    // We can't know the current server period string on the client precisely, but
    // the server returns the last-claimed period per quest id; treat "has a claim
    // whose value is truthy AND progress complete" via the claims map presence.
    return !!game.claims[q.id];
  };
  const progressFor = (q: Quest) => (q.metric ? metrics[q.metric] || 0 : 0);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ink text-bone pb-28">
        <section className="mx-auto max-w-5xl px-5 pt-28">
          {/* XP header */}
          <div className="border-2 border-electric/50 bg-ink/40 p-5 md:p-6 flex items-center gap-5 flex-wrap">
            <Avatar id={game.equippedAvatar} size={72} />
            <div className="flex-1 min-w-[220px]">
              <p className="font-display uppercase tracking-[0.3em] text-electric text-xs">Quests &amp; Rewards</p>
              <p className="font-display uppercase text-3xl leading-tight">
                Level {game.xp.level}
                <span className="text-electric"> · {titleById(game.equippedTitle).name}</span>
              </p>
              <div className="mt-3 h-3 w-full bg-bone/10 rounded-full overflow-hidden">
                <div className="h-full bg-electric" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-bone/50 mt-1">
                {game.xp.into.toLocaleString()} / {game.xp.needed.toLocaleString()} XP to level {game.xp.level + 1} · {game.xp.total.toLocaleString()} total
              </p>
            </div>
            <div className="text-center px-4">
              <p className="text-3xl">🔥</p>
              <p className="font-display uppercase text-2xl leading-none text-electric">{game.streak || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-bone/50">day streak</p>
            </div>
          </div>

          {!game.isPaid && (
            <div className="mt-4 border border-electric/40 bg-electric/5 p-4 text-sm text-bone/80">
              You can play every quest and rack up XP for free. <span className="text-electric">Unlocking avatars, titles &amp; member perks requires an active membership.</span>{" "}
              <a href="/#pricing" className="underline text-electric">Upgrade →</a>
            </div>
          )}

          {/* Level rewards roadmap — advertised to every member */}
          <h2 className="font-display uppercase text-2xl mt-8 mb-2">Level Up, Get Rewarded</h2>
          <p className="text-xs text-bone/50 mb-4">Real perks for dedicated members. Your discount is sent to you once you hit the level.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {LEVEL_REWARDS.map((r) => {
              const reached = game.xp.level >= r.level;
              return (
                <div key={r.level} className={"relative border-2 p-5 text-center " + (reached ? "border-electric bg-electric/10" : "border-bone/15 bg-ink/30")}>
                  <p className="text-3xl">{r.emoji}</p>
                  <p className="font-display uppercase tracking-wider text-electric text-lg mt-1">Level {r.level}</p>
                  <p className="font-display uppercase text-xl text-bone mt-1">{r.reward}</p>
                  <p className={"mt-2 text-[10px] uppercase tracking-wider " + (reached ? "text-electric" : "text-bone/40")}>
                    {reached ? (game.isPaid ? "Unlocked ✓ — your code is on its way" : "Unlocked — upgrade to claim") : `${(1000 * (r.level - 1) * r.level) / 2 - game.xp.total > 0 ? ((1000 * (r.level - 1) * r.level) / 2 - game.xp.total).toLocaleString() : 0} XP to go`}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-bone/40">Discount codes are issued personally by your coach when you reach each level — no spam, no auto-charges.</p>

          {msg && <div className="mt-4 border border-electric bg-electric/10 p-3 text-center font-display uppercase tracking-wider text-sm text-electric">{msg}</div>}

          {/* Quests */}
          <h2 className="font-display uppercase text-2xl mt-10 mb-4">Your Quests</h2>
          <div className="grid gap-3">
            {[...game.quests, ...(game.goalQuests || []), ...game.customQuests].map((q) => {
              const prog = q.metric ? progressFor(q) : (periodClaimed(q) ? 1 : 0);
              const target = q.target || 1;
              const done = q.metric ? prog >= target : true; // custom quests are self-marked
              const claimed = periodClaimed(q);
              const isCustom = !q.metric;
              return (
                <div key={q.id} className="border border-bone/15 bg-ink/30 p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-display uppercase tracking-wider text-sm">
                      {q.title}
                      <span className="ml-2 text-[10px] text-bone/40">{q.period}</span>
                      {isCustom && <span className="ml-2 text-[10px] text-electric">COACH</span>}
                    </p>
                    <p className="text-xs text-bone/60 mt-1">{q.desc}</p>
                    {q.metric && (
                      <div className="mt-2 h-2 w-full max-w-xs bg-bone/10 rounded-full overflow-hidden">
                        <div className="h-full bg-electric" style={{ width: `${Math.min(100, (prog / target) * 100)}%` }} />
                      </div>
                    )}
                    {q.metric && <p className="text-[10px] text-bone/40 mt-1">{Math.min(prog, target)} / {target}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-electric">+{q.xp} XP</p>
                    <button
                      disabled={claimed || !done}
                      onClick={() => claim(q, done)}
                      className={
                        "mt-1 px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
                        (claimed
                          ? "border border-bone/20 text-bone/40 cursor-default"
                          : done
                          ? "bg-electric text-ink hover:bg-bone"
                          : "border border-bone/20 text-bone/40 cursor-not-allowed")
                      }
                    >
                      {claimed ? "Claimed ✓" : done ? (isCustom ? "Mark done +XP" : "Claim +XP") : "In progress"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {isCoach && <CoachQuestForm isAdmin={isAdmin} onCreated={load} />}

          {/* Rewards */}
          <h2 className="font-display uppercase text-2xl mt-12 mb-2">Avatars</h2>
          <p className="text-xs text-bone/50 mb-4">Unlock by leveling up. {game.isPaid ? "Tap an unlocked avatar to equip it." : "Members can equip these."}</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            {AVATARS.map((a) => {
              const unlocked = game.unlocked.avatars.includes(a.id);
              const equipped = game.equippedAvatar === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => unlocked && game.isPaid && equip("avatarId", a.id)}
                  className={"flex flex-col items-center gap-1.5 p-2 border transition-colors " + (equipped ? "border-electric bg-electric/10" : "border-bone/10 hover:border-bone/30")}
                >
                  <Avatar id={a.id} size={54} locked={!unlocked} />
                  <span className="font-display uppercase tracking-wider text-[10px] text-bone/70">{a.name}</span>
                  <span className="text-[9px] text-bone/40">{unlocked ? (equipped ? "Equipped" : "Lvl " + a.level) : "Lvl " + a.level}</span>
                </button>
              );
            })}
          </div>

          <h2 className="font-display uppercase text-2xl mt-12 mb-4">Titles</h2>
          <div className="flex flex-wrap gap-2">
            {TITLES.map((t) => {
              const unlocked = game.unlocked.titles.includes(t.id);
              const equipped = game.equippedTitle === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => unlocked && game.isPaid && equip("titleId", t.id)}
                  className={"px-3 py-2 font-display uppercase tracking-wider text-xs border transition-colors " + (equipped ? "border-electric bg-electric/10 text-electric" : unlocked ? "border-bone/20 text-bone/80 hover:border-bone/40" : "border-bone/10 text-bone/30")}
                >
                  {unlocked ? t.name : `🔒 ${t.name}`} <span className="text-[9px] opacity-60">Lvl {t.level}</span>
                </button>
              );
            })}
          </div>

          {/* Badges */}
          <h2 className="font-display uppercase text-2xl mt-12 mb-2">Badges</h2>
          <p className="text-xs text-bone/50 mb-4">One-off achievements. Earn them once — keep them forever.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {game.badges.map((b) => {
              const earned = game.earnedBadges.includes(b.id);
              return (
                <div key={b.id} className={"flex items-center gap-3 p-3 border " + (earned ? "border-electric/50 bg-electric/5" : "border-bone/10 opacity-60")}>
                  <span className="text-2xl" style={{ filter: earned ? "none" : "grayscale(1)" }}>{earned ? b.emoji : "🔒"}</span>
                  <div>
                    <p className="font-display uppercase tracking-wider text-xs text-bone/90">{b.name}</p>
                    <p className="text-[10px] text-bone/50">{b.desc}</p>
                    <p className="text-[10px] text-electric">+{b.xp} XP</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leaderboard */}
          <h2 className="font-display uppercase text-2xl mt-12 mb-4">Leaderboard</h2>
          <div className="border border-bone/15 bg-ink/30">
            {board.length === 0 && <p className="p-4 text-sm text-bone/50">Log workouts and complete quests to climb the board.</p>}
            {board.map((r, i) => (
              <div key={r.username + i} className="flex items-center gap-3 px-4 py-2.5 border-b border-bone/5 last:border-b-0">
                <span className="font-display text-bone/40 w-6 text-center">{i + 1}</span>
                <Avatar id={r.avatar} size={32} />
                <span className="flex-1 font-display uppercase tracking-wider text-sm">{r.username}</span>
                <span className="text-xs text-bone/50">{titleById(r.title).name}</span>
                <span className="font-display text-electric text-sm w-16 text-right">Lv {r.level}</span>
                <span className="text-xs text-bone/40 w-20 text-right">{r.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}

function CoachQuestForm({ isAdmin, onCreated }: { isAdmin: boolean; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [period, setPeriod] = useState("weekly");
  const [xp, setXp] = useState("100");
  const [scope, setScope] = useState(isAdmin ? "site" : "trainer");
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<{ id: string; title: string; period: string; xp: number; scope: string; active: boolean }[]>([]);

  async function loadMine() {
    const r = await fetch("/api/gamification/quests").then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (r?.quests) setMine(r.quests);
  }
  useEffect(() => { loadMine(); }, []);

  async function create() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/gamification/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, desc, period, xp: parseInt(xp, 10) || 100, scope }),
    });
    setSaving(false);
    setTitle(""); setDesc("");
    loadMine();
    onCreated();
  }

  async function toggle(id: string) {
    await fetch("/api/gamification/quests/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadMine();
    onCreated();
  }

  return (
    <div className="mt-8 border-2 border-electric/40 bg-electric/5 p-5">
      <p className="font-display uppercase tracking-wider text-electric text-sm mb-3">
        {isAdmin ? "Admin panel — create quests for members" : "Coach tools — create a quest for your clients"}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quest title" className="bg-ink border border-bone/20 px-3 py-2 text-sm" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" className="bg-ink border border-bone/20 px-3 py-2 text-sm" />
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-ink border border-bone/20 px-3 py-2 text-sm">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <input value={xp} onChange={(e) => setXp(e.target.value)} type="number" placeholder="XP (10–500)" className="bg-ink border border-bone/20 px-3 py-2 text-sm" />
        {isAdmin && (
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="bg-ink border border-bone/20 px-3 py-2 text-sm">
            <option value="site">Site-wide (all members)</option>
            <option value="trainer">My clients only</option>
          </select>
        )}
      </div>
      <button onClick={create} disabled={saving} className="mt-3 bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors">
        {saving ? "Creating…" : "Create quest →"}
      </button>

      {mine.length > 0 && (
        <div className="mt-5 border-t border-bone/10 pt-4">
          <p className="font-display uppercase tracking-wider text-xs text-bone/60 mb-2">Your quests</p>
          <div className="grid gap-2">
            {mine.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 text-sm border border-bone/10 bg-ink/40 px-3 py-2">
                <span className={q.active ? "text-bone/90" : "text-bone/40 line-through"}>
                  {q.title} <span className="text-[10px] text-bone/40">· {q.period} · +{q.xp} · {q.scope}</span>
                </span>
                <button onClick={() => toggle(q.id)} className="font-display uppercase tracking-wider text-[10px] text-electric hover:underline">
                  {q.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
