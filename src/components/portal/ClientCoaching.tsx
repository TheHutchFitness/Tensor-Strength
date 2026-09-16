"use client";

import { useEffect, useState } from "react";
import MessageThread from "./MessageThread";

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

function fmtSize(b: number) {
  if (!b) return "";
  if (b < 1024 * 1024) return Math.round(b / 1024) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

export default function ClientCoaching({ meId }: { meId: string }) {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [files, setFiles] = useState<TFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"programs" | "messages" | "files">("programs");

  useEffect(() => {
    (async () => {
      const [tr, pr, fl] = await Promise.all([
        fetch("/api/client/trainer").then((r) => (r.ok ? r.json() : { trainer: null })),
        fetch("/api/client/programs").then((r) => (r.ok ? r.json() : { programs: [] })),
        fetch("/api/client/files").then((r) => (r.ok ? r.json() : { files: [] })),
      ]);
      setTrainer(tr.trainer || null);
      setPrograms(pr.programs || []);
      setFiles(fl.files || []);
      setLoading(false);
    })();
  }, []);

  function loadIntoTracker(p: Program) {
    try {
      localStorage.setItem("ts-pending-program", JSON.stringify(p));
    } catch {}
    window.location.href = "/clients/workout-log";
  }

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
      <div className="flex flex-wrap gap-2 mt-6 mb-6 border-b border-bone/15 pb-2">
        {([
          { id: "programs", label: `Programs${programs.length ? ` (${programs.length})` : ""}` },
          { id: "messages", label: "Message Coach" },
          { id: "files", label: `Files${files.length ? ` (${files.length})` : ""}` },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-5 py-3 font-display uppercase tracking-wider text-sm transition-colors " +
              (tab === t.id ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

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

      {tab === "messages" && <MessageThread withUserId={trainer.id} meId={meId} />}

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
