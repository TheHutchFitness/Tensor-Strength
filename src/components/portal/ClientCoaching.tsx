"use client";

import { useEffect, useState } from "react";
import MessageThread, { type MessageContext } from "./MessageThread";

type Trainer = { id: string; name: string; photo: string; trainerType: string };
type Program = {
  id: string;
  title: string;
  notes: string;
  trainerName: string;
  clientId: string | null;
  exercises: { name: string; cue: string; sets: string; reps: string; load: string; notes: string }[];
  createdAt: string;
};
type TFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  mime: string;
  clientId: string | null;
  createdAt: string;
};
type Reminder = { title: string; body: string; href: string; cta: string };

function fmtSize(b: number) {
  if (!b) return "";
  if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

export default function ClientCoaching({
  meId,
  accessType = "",
  initialMessage = "",
  initialContext = null,
}: {
  meId: string;
  accessType?: string;
  initialMessage?: string;
  initialContext?: MessageContext | null;
}) {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [files, setFiles] = useState<TFile[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"hub" | "programs" | "messages" | "files">("hub");
  const [messageDraft, setMessageDraft] = useState(initialMessage);
  const [messageContext, setMessageContext] = useState<MessageContext | null>(initialContext);
  const [reminder, setReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    (async () => {
      const [trainerResponse, programResponse, fileResponse] = await Promise.all([
        fetch("/api/client/trainer"),
        fetch("/api/client/programs"),
        fetch("/api/client/files"),
      ]);
      if (!trainerResponse.ok || !programResponse.ok || !fileResponse.ok) throw new Error("Could not load coaching");
      const [tr, pr, fl] = await Promise.all([trainerResponse.json(), programResponse.json(), fileResponse.json()]);
      setTrainer(tr.trainer || null);
      setPrograms(pr.programs || []);
      setFiles(fl.files || []);
      setLoading(false);
      Promise.all([
        fetch("/api/client/tracker").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/checkins").then((r) => (r.ok ? r.json() : null)),
      ]).then(([tracker, checkins]) => {
        const latestWorkout = (tracker?.workouts || []).reduce((latest: number, workout: { date?: string }) => {
          const time = new Date(workout.date || "").getTime();
          return Number.isFinite(time) && time > latest ? time : latest;
        }, 0);
        const latestCheckin = new Date(checkins?.checkins?.[0]?.createdAt || "").getTime();
        const daysSinceWorkout = latestWorkout ? Math.floor((Date.now() - latestWorkout) / 86400000) : Infinity;
        const daysSinceCheckin = Number.isFinite(latestCheckin) ? Math.floor((Date.now() - latestCheckin) / 86400000) : Infinity;
        if (daysSinceWorkout >= 5) {
          setReminder({ title: "Training reminder", body: latestWorkout ? `It has been ${daysSinceWorkout} days since your last logged session.` : "You have not logged a session yet.", href: "/clients/workout-log", cta: "Log a session →" });
        } else if ((accessType === "remote_coaching" || accessType === "in_person") && daysSinceCheckin >= 7) {
          setReminder({ title: "Weekly check-in", body: "Share your recovery, wins and any adjustments you need before the next training week.", href: "/clients/check-in", cta: "Send check-in →" });
        } else {
          setReminder({ title: "Next step", body: "Log training as you go, then message your coach while the details are fresh.", href: "/clients/workout-log", cta: "Open workout log →" });
        }
      }).catch(() => {});
    })().catch(() => { setLoadError(true); setLoading(false); });
  }, [accessType]);

  useEffect(() => {
    if (initialMessage) {
      setMessageDraft(initialMessage);
      setMessageContext(initialContext);
      setTab("messages");
    }
  }, [initialMessage, initialContext]);

  function openMessage(text: string, context: MessageContext) {
    setMessageDraft(text);
    setMessageContext(context);
    setTab("messages");
  }

  function loadIntoTracker(p: Program) {
    try {
      sessionStorage.setItem("ts-pending-program", JSON.stringify({ ...p, userId: meId }));
    } catch { alert("Unable to open the workout because browser storage is unavailable. Please enable storage and retry."); return; }
    window.location.href = "/clients/workout-log";
  }

  if (loadError) return <p role="alert" className="mt-6 text-bone/70">Could not load coaching. <button onClick={() => window.location.reload()} className="text-electric underline">Retry</button></p>;

  if (loading) {
    return (
      <p className="mt-6 font-display uppercase tracking-wider text-bone/50 text-sm">Loading your coaching…</p>
    );
  }

  if (!trainer) {
    return (
      <div className="mt-6 border border-bone/15 bg-ink/20 p-8">
        <p className="text-bone/70 leading-relaxed">
          You don&apos;t have a trainer assigned yet. Once Hutch assigns you a
          coach, your programs, files and a direct message thread will appear
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Trainer header */}
      <div className="flex items-center gap-4 border border-bone/15 bg-ink/30 p-4">
        {trainer.photo ? (
          <img src={trainer.photo} alt={trainer.name} className="h-14 w-14 object-cover rounded-full border-2 border-electric" />
        ) : (
          <div className="h-14 w-14 rounded-full border-2 border-electric bg-ink flex items-center justify-center font-display text-electric text-xl">
            {trainer.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-bone/50">Your coach</p>
          <p className="font-display uppercase tracking-wider text-bone text-lg">{trainer.name}</p>
          <p className="text-electric text-xs uppercase tracking-wider">{trainer.trainerType}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="ts-mobile-tabs mt-6 mb-5 sm:mb-6 border-b border-bone/15">
        {([
          { id: "hub", label: "Coaching Hub" },
          { id: "programs", label: `Programs${programs.length ? ` (${programs.length})` : ""}` },
          { id: "messages", label: "Message Coach" },
          { id: "files", label: `Files${files.length ? ` (${files.length})` : ""}` },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-4 sm:px-5 py-3 font-display uppercase tracking-wider text-xs sm:text-sm transition-colors " +
              (tab === t.id ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "hub" && (
        <div className="grid gap-5">
          <div className="border border-electric/35 bg-electric/5 p-5">
            <p className="font-display uppercase tracking-wider text-electric text-sm">Your coaching lane</p>
            <p className="mt-2 text-sm text-bone/75 leading-relaxed">
              {accessType === "remote_coaching"
                ? "Use this space for program questions, form clips and weekly updates. Include the exercise, what you felt, and your last working set so your coach can act quickly."
                : accessType === "in_person"
                  ? "Use this space for between-session questions, training homework and form clips. Bring bigger program changes into your next session or check-in."
                  : "Your coach can share programs, files and direct training guidance here."}
            </p>
            <p className="mt-3 text-xs text-bone/50 leading-relaxed">Message timing follows your coaching agreement. This chat is for training support, not urgent medical or emergency help.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <button onClick={() => openMessage("I have a question about my current program.", { kind: "workout", title: "Program question" })} className="text-left border border-bone/15 bg-ink/20 p-4 hover:border-electric transition-colors min-h-[108px]">
              <p className="font-display uppercase tracking-wider text-bone text-sm">Program question</p>
              <p className="mt-1 text-xs text-bone/50">Ask about a movement, load, swap or schedule.</p>
            </button>
            <button onClick={() => openMessage("I'm sending a form clip for review. Please let me know what to adjust.", { kind: "form_review", title: "Form review" })} className="text-left border border-bone/15 bg-ink/20 p-4 hover:border-electric transition-colors min-h-[108px]">
              <p className="font-display uppercase tracking-wider text-bone text-sm">Form review</p>
              <p className="mt-1 text-xs text-bone/50">Attach a short video and name the lift.</p>
            </button>
            <a href="/clients/check-in" className="border border-bone/15 bg-ink/20 p-4 hover:border-electric transition-colors min-h-[108px]">
              <p className="font-display uppercase tracking-wider text-bone text-sm">Weekly check-in</p>
              <p className="mt-1 text-xs text-bone/50">Share wins, recovery and anything that needs adjusting.</p>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border border-bone/15 bg-ink/20 p-4">
            <div>
              <p className="font-display uppercase tracking-wider text-bone text-sm">{reminder?.title || "Keep the plan moving"}</p>
              <p className="mt-1 text-xs text-bone/50">{reminder?.body || "Log your next session, then flag a problem while the details are fresh."}</p>
            </div>
            <a href={reminder?.href || "/clients/workout-log"} className="font-display uppercase tracking-wider text-xs text-electric hover:text-bone">{reminder?.cta || "Open workout log →"}</a>
          </div>
        </div>
      )}

      {tab === "programs" && (
        <div className="grid gap-4">
          {programs.length === 0 ? (
            <p className="text-bone/50 text-sm">No programs from your coach yet.</p>
          ) : (
            programs.map((p) => (
              <div key={p.id} className="border border-bone/15 bg-ink/20 p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-display uppercase tracking-wider text-bone text-lg">{p.title}</p>
                    <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-1">
                      {p.clientId ? "For you" : "For all clients"} · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => loadIntoTracker(p)}
                    className="bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors whitespace-nowrap"
                  >
                    Load into Tracker →
                  </button>
                </div>
                {p.notes && <p className="text-sm text-bone/60 mt-3 italic">{p.notes}</p>}
                {p.exercises.length > 0 && (
                  <ul className="mt-4 grid gap-2">
                    {p.exercises.map((ex, i) => (
                      <li key={i} className="text-sm border-l-2 border-electric/40 pl-3">
                        <span className="font-display uppercase tracking-wider text-bone/90">{ex.name}</span>
                        <span className="text-bone/50">
                          {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.load, ex.notes]
                            .filter(Boolean)
                            .map((x) => ` · ${x}`)
                            .join("")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "messages" && <MessageThread withUserId={trainer.id} meId={meId} initialText={messageDraft} initialContext={messageContext} />}

      {tab === "files" && (
        <div className="grid gap-3">
          {files.length === 0 ? (
            <p className="text-bone/50 text-sm">No files from your coach yet.</p>
          ) : (
            files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center justify-between gap-4 border border-bone/15 bg-ink/20 p-4 hover:border-electric transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-electric font-display text-lg shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="font-display uppercase tracking-wider text-bone/90 text-sm truncate">{f.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-bone/40">
                      {f.clientId ? "For you" : "For all clients"} {f.size ? `· ${fmtSize(f.size)}` : ""}
                    </p>
                  </div>
                </div>
                <span className="font-display uppercase tracking-wider text-xs text-electric group-hover:text-bone shrink-0">
                  Download →
                </span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
