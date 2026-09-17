"use client";

import { useEffect, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";
import Footer from "../../../src/components/Footer";
import { memberPrograms } from "../../../src/data/memberPrograms";

export default function MyProgramsPage() {
  const [loadError, setLoadError] = useState(false);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [coachPrograms, setCoachPrograms] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [activeProgramId, setActiveProgramId] = useState("");
  const [openProgramId, setOpenProgramId] = useState("");
  const [mine, setMine] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  // Builder state
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [length, setLength] = useState("4 weeks");
  const [raw, setRaw] = useState("Day A\nBack Squat | 3 | 5 | 8 | add weight\nBench Press | 3 | 5 | 8 |\n\nDay B\nDeadlift | 1 | 5 | 8 |");

  async function loadCoach() {
    const r = await fetch("/api/trainer/programs").then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (r?.programs) setMine(r.programs);
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) { window.location.href = "/login?from=/clients/my-programs"; return; }
      const { user } = await me.json();
      if (!user.portalAccess && !user.isTrainer) { window.location.href = "/clients"; return; }
      const coach = !!user.isTrainer || user.role === "admin";
      setUserId(user.id || "");
      try { setActiveProgramId(localStorage.getItem(`ts-active-program:${user.id}`) || ""); } catch {}
      setIsCoach(coach);
      setOk(true); setLoading(false);
      fetch("/api/member/programs").then((r) => (r.ok ? r.json() : null)).then((d) => d?.programs && setCoachPrograms(d.programs)).catch(() => {});
      fetch("/api/client/tracker").then((r) => (r.ok ? r.json() : null)).then((d) => setWorkouts(d?.workouts || [])).catch(() => {});
      if (coach) loadCoach();
    })().catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  function parseSessions(text: string) {
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    return blocks.map((b, i) => {
      const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
      const title = lines.shift() || `Day ${i + 1}`;
      const exercises = lines.map((l) => {
        const [exercise, sets, reps, rpe, notes] = l.split("|").map((x) => (x || "").trim());
        return { exercise, sets, reps, rpe, notes };
      }).filter((e) => e.exercise);
      return { id: `s${i}`, title, exercises };
    }).filter((s) => s.exercises.length);
  }

  async function createProgram() {
    const sessions = parseSessions(raw);
    if (!name.trim() || !sessions.length) { setMsg("Add a name and at least one session with exercises."); return; }
    const r = await fetch("/api/trainer/programs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, blurb, length, sessions }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Program created for your clients." : d.error || "Could not create.");
    if (r.ok) { setName(""); setBlurb(""); loadCoach(); }
    setTimeout(() => setMsg(""), 3500);
  }

  async function del(id: string) {
    await fetch(`/api/trainer/programs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    loadCoach();
  }

  async function markComplete(id: string) {
    const r = await fetch("/api/gamification/program-complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: id }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? (d.already ? "Already claimed this program." : `🏁 Program complete! +${d.gained} XP + badge`) : "Could not claim");
    setTimeout(() => setMsg(""), 3500);
  }

  function nextSession(program: any) {
    const ids = (program.sessions || []).map((session: any) => session.id);
    let lastId = "";
    for (const workout of workouts) {
      const found = (program.sessions || []).find((session: any) => (workout.title || "").startsWith(`${program.name} — ${session.title}`));
      if (found) { lastId = found.id; break; }
    }
    const nextId = lastId ? ids[(ids.indexOf(lastId) + 1) % ids.length] : ids[0];
    return (program.sessions || []).find((session: any) => session.id === nextId) || program.sessions?.[0];
  }

  function loggedSessionCount(program: any) {
    const logged = new Set<string>();
    for (const workout of workouts) {
      const found = (program.sessions || []).find((session: any) => (workout.title || "").startsWith(`${program.name} — ${session.title}`));
      if (found) logged.add(found.id);
    }
    return logged.size;
  }

  function setCurrentPlan(id: string) {
    setActiveProgramId(id);
    try { localStorage.setItem(`ts-active-program:${userId}`, id); } catch {}
  }

  function sessionMinutes(session: any) {
    const workSets = (session.exercises || []).reduce((total: number, exercise: any) => total + (parseInt(exercise.sets, 10) || 1), 0);
    return Math.max(20, Math.min(100, Math.round(8 + workSets * 2.5)));
  }

  if (loadError) return <><PortalHeader /><main className="min-h-screen p-8 text-bone" role="alert">Could not load your programs. <button className="text-electric underline" onClick={() => window.location.reload()}>Try again</button></main></>;
  if (loading || !ok) {
    return (<><PortalHeader /><main className="min-h-screen bg-ink pt-28 text-center text-bone/60">Loading your programs…</main></>);
  }

  const Card = ({ p, coach }: { p: any; coach?: boolean }) => {
    const next = nextSession(p);
    const complete = loggedSessionCount(p);
    const isCurrent = activeProgramId === p.id;
    const allSessionsDone = complete >= p.sessions.length;
    const startHref = next ? `/clients/workout-log?program=${encodeURIComponent(p.id)}&session=${encodeURIComponent(next.id)}` : "/clients/workout-log";
    return (
    <div className={"border bg-ink/30 p-5 flex flex-col " + (isCurrent ? "border-electric" : "border-bone/15")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display uppercase tracking-wider text-lg text-bone">{p.name}{coach && <span className="ml-2 text-[9px] text-electric">COACH</span>}</p>
          {isCurrent && <p className="mt-1 text-[10px] font-display uppercase tracking-wider text-electric">Current training plan</p>}
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-bone/50">{complete}/{p.sessions.length} sessions logged</span>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-electric mt-0.5">{p.length}{p.deloadable ? " · deload option" : ""}</p>
      <p className="text-sm text-bone/65 mt-2 flex-1 leading-relaxed">{p.blurb}</p>
      {next && <p className="mt-3 border-l-2 border-electric/50 pl-3 text-xs text-bone/70">Next: <span className="text-bone">{next.title}</span> <span className="text-bone/45">· ~{sessionMinutes(next)} min</span></p>}
      <div className="mt-4 flex gap-2 flex-wrap">
        <a href={startHref} onClick={() => setCurrentPlan(p.id)} className="bg-electric text-ink px-4 py-2 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors">Start next session →</a>
        <button onClick={() => setCurrentPlan(p.id)} className="border border-bone/25 text-bone/70 px-4 py-2 font-display uppercase tracking-wider text-xs hover:border-electric hover:text-electric transition-colors">{isCurrent ? "Current plan" : "Set as current"}</button>
        <button onClick={() => setOpenProgramId(openProgramId === p.id ? "" : p.id)} className="border border-bone/25 text-bone/70 px-4 py-2 font-display uppercase tracking-wider text-xs hover:border-electric hover:text-electric transition-colors">{openProgramId === p.id ? "Hide sessions" : "View sessions"}</button>
        <button onClick={() => markComplete(p.id)} disabled={!allSessionsDone} title={allSessionsDone ? "Claim your Program Finisher reward" : "Log every session once before claiming"} className="border border-bone/25 text-bone/70 px-4 py-2 font-display uppercase tracking-wider text-xs hover:border-bone hover:text-bone transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{allSessionsDone ? "Complete block 🏁" : "Finish sessions first"}</button>
      </div>
      {openProgramId === p.id && (
        <div className="mt-4 border-t border-bone/10 pt-3 grid gap-2">
          {(p.sessions || []).map((session: any, index: number) => {
            const done = workouts.some((workout) => (workout.title || "").startsWith(`${p.name} — ${session.title}`));
            const isNext = next?.id === session.id;
            return <div key={session.id} className={"flex items-center justify-between gap-3 border px-3 py-2 " + (isNext ? "border-electric/50 bg-electric/5" : "border-bone/10 bg-ink/20")}>
              <span className="min-w-0 text-sm text-bone/85 truncate">{done ? "✓ " : ""}{index + 1}. {session.title} <span className="text-[10px] text-bone/40">· {session.exercises.length} exercises · ~{sessionMinutes(session)} min</span></span>
              <a href={`/clients/workout-log?program=${encodeURIComponent(p.id)}&session=${encodeURIComponent(session.id)}`} onClick={() => setCurrentPlan(p.id)} className="shrink-0 text-[10px] font-display uppercase tracking-wider text-electric hover:text-bone">{isNext ? "Start →" : "Open →"}</a>
            </div>;
          })}
        </div>
      )}
    </div>
    );
  };

  return (
    <>
      <PortalHeader />
      <main className="min-h-screen bg-ink text-bone pb-28">
        <section className="mx-auto max-w-5xl px-5 pt-28">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs">Member Library</p>
          <h1 className="font-display uppercase text-4xl md:text-5xl leading-tight mt-2">My Programs</h1>
          <p className="mt-3 text-bone/70 max-w-2xl">Every training block you can run, in one place. Open any program to load its sessions straight into your workout tracker. Finish a full block to earn the Program Finisher badge.</p>
          {msg && <div className="mt-4 border border-electric bg-electric/10 p-3 text-center font-display uppercase tracking-wider text-sm text-electric">{msg}</div>}

          <div className="mt-8 border-2 border-electric/50 bg-electric/5 p-6">
            <p className="font-display uppercase tracking-wider text-electric text-xs">Signature</p>
            <h2 className="font-display uppercase text-2xl mt-1">The Hutch Touch</h2>
            <p className="text-sm text-bone/70 mt-2 max-w-2xl">Hutch's real 4-session performance rotation with variation progression, readiness check, and auto-advance built in.</p>
            <a href="/clients/workout-log" className="inline-block mt-4 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors">Open in tracker →</a>
          </div>

          {coachPrograms.length > 0 && (
            <>
              <h2 className="font-display uppercase text-2xl mt-10 mb-4">From Your Coach</h2>
              <div className="grid md:grid-cols-2 gap-4">{coachPrograms.map((p) => <Card key={p.id} p={p} coach />)}</div>
            </>
          )}

          <h2 className="font-display uppercase text-2xl mt-10 mb-4">Tensor Programs</h2>
          <div className="grid md:grid-cols-2 gap-4">{memberPrograms.map((p) => <Card key={p.id} p={p} />)}</div>

          {isCoach && (
            <div className="mt-12 border-2 border-electric/40 bg-electric/5 p-6">
              <p className="font-display uppercase tracking-wider text-electric text-sm">Coach — build a program for your clients</p>
              <p className="text-xs text-bone/50 mt-1 mb-4">Only your assigned clients will see it. Separate each session with a blank line. First line = session title, then one exercise per line as: <span className="text-bone/70">Exercise | sets | reps | rpe | notes</span></p>
              <div className="grid sm:grid-cols-3 gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Program name" className="bg-ink border border-bone/20 px-3 py-2 text-sm" />
                <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="Length (e.g. 4 weeks)" className="bg-ink border border-bone/20 px-3 py-2 text-sm" />
                <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Short blurb" className="bg-ink border border-bone/20 px-3 py-2 text-sm" />
              </div>
              <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} className="mt-3 w-full bg-ink border border-bone/20 px-3 py-2 text-sm font-mono" />
              <button onClick={createProgram} className="mt-3 bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors">Create program →</button>

              {mine.length > 0 && (
                <div className="mt-6 border-t border-bone/10 pt-4">
                  <p className="font-display uppercase tracking-wider text-xs text-bone/60 mb-2">Your programs</p>
                  <div className="grid gap-2">
                    {mine.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 text-sm border border-bone/10 bg-ink/40 px-3 py-2">
                        <span className="text-bone/85">{p.name} <span className="text-[10px] text-bone/40">· {p.sessions.length} sessions · {p.clientIds?.length || 0} clients</span></span>
                        <button onClick={() => del(p.id)} className="font-display uppercase tracking-wider text-[10px] text-electric hover:underline">Delete</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />

    </>
  );
}
