"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TrainerProfileForm from "@/components/portal/TrainerProfileForm";
import TrainerPrograms from "@/components/portal/TrainerPrograms";
import TrainerFiles from "@/components/portal/TrainerFiles";
import TrainerMessages from "@/components/portal/TrainerMessages";

type Client = {
  id: string;
  username: string;
  email: string;
  portalAccess: boolean;
  checkinCount: number;
  unseenCheckins?: number;
  lastCheckinAt: string | null;
};

type CheckIn = {
  id: string;
  week?: string;
  wins?: string;
  struggles?: string;
  readiness?: string;
  trainerNote?: string;
  createdAt: string;
};

type Tab = "clients" | "messages" | "programs" | "files" | "profile";

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function TrainersPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [meId, setMeId] = useState("");
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [tab, setTab] = useState<Tab>("clients");

  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [unread, setUnread] = useState(0);
  const [unseenCheckins, setUnseenCheckins] = useState(0);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  async function loadClients() {
    const res = await fetch("/api/trainer/clients");
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients || []);
    }
  }

  async function loadUnseen() {
    const res = await fetch("/api/trainer/checkins-unseen");
    if (res.ok) {
      const d = await res.json();
      setUnseenCheckins(d.count || 0);
    }
  }

  async function loadUnread() {
    const res = await fetch("/api/messages/unread");
    if (res.ok) {
      const d = await res.json();
      setUnread(d.count || 0);
    }
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        window.location.href = "/login?from=/trainers";
        return;
      }
      const { user } = await me.json();
      if (!user.isTrainer && user.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setMeId(user.id);
      const prof = await fetch("/api/trainer/profile").then((r) => (r.ok ? r.json() : { completed: true }));
      const completed = !!prof.completed;
      setProfileCompleted(completed);
      if (!completed) setTab("profile");
      setAuthorized(true);
      await loadClients();
      await loadUnread();
      await loadUnseen();
      setLoading(false);
    })();
    const t = setInterval(() => {
      loadUnread();
      loadUnseen();
    }, 8000);
    return () => clearInterval(t);
  }, []);

  async function openClient(c: Client) {
    setSelected(c);
    setLoadingCheckins(true);
    setCheckins([]);
    setClientProfile(null);
    const res = await fetch(`/api/trainer/checkins?clientId=${encodeURIComponent(c.id)}`);
    if (res.ok) {
      const data = await res.json();
      setCheckins(data.checkins || []);
      setClientProfile(data.client?.profile || null);
    }
    setLoadingCheckins(false);
    // Viewing marks them seen server-side — refresh badges.
    await loadClients();
    await loadUnseen();
  }

  async function saveNote(ci: CheckIn) {
    setSavingNote(ci.id);
    const note = noteDraft[ci.id] ?? ci.trainerNote ?? "";
    const res = await fetch("/api/trainer/checkins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkinId: ci.id, note }),
    });
    if (res.ok) {
      const d = await res.json();
      setCheckins((list) => list.map((x) => (x.id === ci.id ? { ...x, trainerNote: d.checkin.trainerNote } : x)));
    }
    setSavingNote(null);
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "clients", label: "Clients", badge: unseenCheckins },
    { id: "messages", label: "Messages", badge: unread },
    { id: "programs", label: "Programs" },
    { id: "files", label: "Files" },
    { id: "profile", label: "My Profile" },
  ];

  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">Trainers</p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Coach <span className="text-electric">workspace.</span>
          </h1>

          {loading || !authorized ? (
            <p className="mt-12 font-display uppercase tracking-wider text-bone/50">Loading…</p>
          ) : (
            <>
              {!profileCompleted && (
                <div className="mt-8 border-2 border-electric/50 bg-electric/5 p-5">
                  <p className="font-display uppercase tracking-wider text-electric text-sm">Finish your profile</p>
                  <p className="text-bone/70 text-sm mt-1 leading-relaxed">
                    Add your photo, bio, trainer type and certifications so you appear on the public site and can start coaching.
                  </p>
                </div>
              )}

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mt-8 mb-8 border-b border-bone/15 pb-2">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={
                      "relative px-5 py-3 font-display uppercase tracking-wider text-sm transition-colors " +
                      (tab === t.id ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")
                    }
                  >
                    {t.label}
                    {t.badge ? (
                      <span className="ml-2 inline-block bg-electric text-ink text-[10px] font-display px-1.5 py-0.5 rounded-full align-middle">
                        {t.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {/* CLIENTS TAB */}
              {tab === "clients" && (
                <div className="grid md:grid-cols-[320px_1fr] gap-8">
                  <div className="border border-bone/15 bg-ink/20">
                    <div className="p-4 border-b border-bone/15">
                      <p className="font-display uppercase tracking-wider text-xs text-bone/60">
                        Assigned clients ({clients.length})
                      </p>
                    </div>
                    {clients.length === 0 ? (
                      <p className="p-6 text-sm text-bone/50">
                        No clients assigned to you yet. Ask the admin to assign members to your account.
                      </p>
                    ) : (
                      <ul>
                        {clients.map((c) => (
                          <li key={c.id}>
                            <button
                              onClick={() => openClient(c)}
                              className={
                                "w-full text-left px-4 py-4 border-b border-bone/10 transition-colors " +
                                (selected?.id === c.id ? "bg-electric/10 border-l-2 border-l-electric" : "hover:bg-ink/40")
                              }
                            >
                              <p className="font-display uppercase tracking-wider text-bone/90">{c.username}</p>
                              <p className="text-xs text-bone/50 mt-1">{c.email}</p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] uppercase tracking-wider">
                                <span className="text-electric font-display">{c.checkinCount} check-ins</span>
                                <span className="text-bone/40">Last: {fmt(c.lastCheckinAt)}</span>
                                {c.unseenCheckins ? (
                                  <span className="bg-electric text-ink font-display px-2 py-0.5 rounded-full">
                                    {c.unseenCheckins} new
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    {!selected ? (
                      <div className="border border-bone/15 bg-ink/20 p-10 text-center text-bone/50">
                        Select a client to view their check-ins.
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-between flex-wrap gap-2">
                          <h2 className="font-display uppercase text-2xl font-700 text-bone">
                            {selected.username}<span className="text-electric">.</span>
                          </h2>
                          <span className="text-xs text-bone/50">{selected.email}</span>
                        </div>
                        {clientProfile && (
                          <div className="mt-6 border border-electric/30 bg-electric/5 p-5">
                            <p className="font-display uppercase tracking-wider text-electric text-sm mb-3">About this client</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              {[
                                ["Squat", clientProfile.squat],
                                ["Bench", clientProfile.bench],
                                ["Deadlift", clientProfile.deadlift],
                                ["OHP", clientProfile.overheadPress],
                                ["Diet", clientProfile.diet],
                                ["Gym", clientProfile.gym],
                                ["Workouts/wk", clientProfile.workoutsPerWeek],
                                ["Activity", clientProfile.activityLevel],
                                ["Resting HR", clientProfile.restingHeartRate],
                                ["Calories", clientProfile.currentCalories],
                              ]
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                  <div key={k as string}>
                                    <p className="text-[10px] uppercase tracking-wider text-bone/50">{k}</p>
                                    <p className="text-bone/90">{v as string}</p>
                                  </div>
                                ))}
                            </div>
                            {clientProfile.notes && (
                              <p className="mt-3 text-sm text-bone/70 border-t border-bone/10 pt-3">{clientProfile.notes}</p>
                            )}
                          </div>
                        )}
                        {loadingCheckins ? (
                          <p className="mt-8 font-display uppercase tracking-wider text-bone/50">Loading check-ins…</p>
                        ) : checkins.length === 0 ? (
                          <div className="mt-6 border border-bone/15 bg-ink/20 p-8 text-center text-bone/50">
                            This client hasn&apos;t submitted any check-ins yet.
                          </div>
                        ) : (
                          <div className="mt-6 space-y-4">
                            {checkins.map((ci) => (
                              <div key={ci.id} className="border border-bone/15 bg-ink/20 p-5">
                                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                  <p className="font-display uppercase tracking-wider text-electric text-sm">
                                    {ci.week ? `Week: ${ci.week}` : "Check-in"}
                                  </p>
                                  <span className="text-[10px] uppercase tracking-wider text-bone/40">{fmt(ci.createdAt)}</span>
                                </div>
                                {ci.readiness && (
                                  <p className="text-sm mb-2">
                                    <span className="text-bone/50 uppercase text-[10px] tracking-wider">Readiness: </span>
                                    <span className="text-bone/90">{ci.readiness}</span>
                                  </p>
                                )}
                                {ci.wins && (
                                  <p className="text-sm mb-2">
                                    <span className="text-bone/50 uppercase text-[10px] tracking-wider">Wins: </span>
                                    <span className="text-bone/90">{ci.wins}</span>
                                  </p>
                                )}
                                {ci.struggles && (
                                  <p className="text-sm">
                                    <span className="text-bone/50 uppercase text-[10px] tracking-wider">Struggles: </span>
                                    <span className="text-bone/90">{ci.struggles}</span>
                                  </p>
                                )}
                                <div className="mt-4 border-t border-bone/10 pt-4">
                                  <p className="text-[10px] uppercase tracking-wider text-electric mb-2">
                                    Private coach note
                                  </p>
                                  <textarea
                                    value={noteDraft[ci.id] ?? ci.trainerNote ?? ""}
                                    onChange={(e) => setNoteDraft((d) => ({ ...d, [ci.id]: e.target.value }))}
                                    rows={2}
                                    placeholder="Track adjustments, cues, next steps… (only you can see this)"
                                    className="w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone text-sm focus:border-electric outline-none resize-none"
                                  />
                                  <button
                                    onClick={() => saveNote(ci)}
                                    disabled={savingNote === ci.id}
                                    className="mt-2 font-display uppercase tracking-wider text-xs border border-electric text-electric px-4 py-2 hover:bg-electric hover:text-ink transition-colors disabled:opacity-50"
                                  >
                                    {savingNote === ci.id ? "Saving…" : "Save note"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === "messages" && meId && (
                <TrainerMessages meId={meId} onUnreadChange={loadUnread} />
              )}
              {tab === "programs" && <TrainerPrograms />}
              {tab === "files" && <TrainerFiles />}
              {tab === "profile" && (
                <TrainerProfileForm onSaved={() => setProfileCompleted(true)} />
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
