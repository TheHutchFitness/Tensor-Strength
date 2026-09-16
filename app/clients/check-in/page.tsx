"use client";

import { useEffect, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";
import VideoUploader from "../../../src/components/VideoUploader";

type Status = "idle" | "submitting" | "success" | "error";

type Reply = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "coach" | "member";
  text: string;
  video: string | null;
  createdAt: string;
};

type CheckIn = {
  id: string;
  week: string;
  readiness: string;
  wins: string;
  struggles: string;
  video: string | null;
  trainerNote: string;
  hasCoachReply?: boolean;
  replies?: Reply[];
  createdAt: string;
};

type DemoVideo = {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  clientId: string | null;
  createdAt: string;
};

function fmt(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CheckInPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [meId, setMeId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [videoUrl, setVideoUrl] = useState("");

  const [history, setHistory] = useState<CheckIn[]>([]);
  const [demos, setDemos] = useState<DemoVideo[]>([]);

  async function loadFeeds() {
    const [h, v] = await Promise.all([
      fetch("/api/checkins").then((r) => (r.ok ? r.json() : { checkins: [] })),
      fetch("/api/member/videos").then((r) => (r.ok ? r.json() : { videos: [] })),
    ]);
    setHistory(h.checkins || []);
    setDemos(v.videos || []);
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        window.location.href = "/login?from=/clients/check-in";
        return;
      }
      const { user } = await me.json();
      if (!user.portalAccess) {
        window.location.href = "/clients";
        return;
      }
      setUsername(user.username || "");
      setMeId(user.id || "");
      setAuthorized(true);
      await loadFeeds();
      setLoading(false);
    })();
  }, []);

  async function handleCheckIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      week: data.get("week"),
      wins: data.get("wins"),
      struggles: data.get("struggles"),
      readiness: data.get("readiness"),
      videoUrl: videoUrl || null,
    };
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
      setVideoUrl("");
      await loadFeeds();
    } catch {
      setStatus("error");
    }
  }

  const inputCls = "w-full bg-transparent border-b-2 border-bone/40 py-3 text-bone focus:border-electric outline-none";
  const selectCls = "w-full bg-ink/60 border-b-2 border-bone/40 py-3 text-bone focus:border-electric outline-none";

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
          Weekly Check-In &amp; Form Review
        </p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          How did the <span className="text-electric">week go?</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
          Submit your check-in and drop a form video so your coach can review your
          progress and reply — with notes or a video of their own.
        </p>
        <a
          href="/clients/book?type=remote"
          className="inline-flex items-center gap-2 mt-4 border-2 border-electric text-electric px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-electric hover:text-ink transition-colors"
        >
          💻 Book a video check-in (Google Meet)
        </a>

        {loading || !authorized ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">Loading…</p>
        ) : (
          <>
            {status === "success" ? (
              <div className="mt-8 border-2 border-electric bg-ink/30 backdrop-blur-sm p-8 text-center">
                <p className="glow font-display uppercase text-xl text-electric">Check-in received.</p>
                <p className="mt-3 text-bone/80">Thanks for the update — your coach will review it and reply below.</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-6 font-display uppercase tracking-wider text-xs border border-electric text-electric px-5 py-2.5 hover:bg-electric hover:text-ink transition-colors"
                >
                  Submit another
                </button>
              </div>
            ) : (
              <form onSubmit={handleCheckIn} className="mt-8 grid gap-5">
                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">Name</span>
                  <input name="name" required defaultValue={username} className={inputCls + " mt-2"} />
                </label>

                <div className="grid sm:grid-cols-2 gap-5">
                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">Training week</span>
                    <select name="week" className={selectCls + " mt-2"}>
                      <option>Week 1</option>
                      <option>Week 2</option>
                      <option>Week 3</option>
                      <option>Week 4</option>
                      <option>Deload week</option>
                      <option>Testing / max-out week</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">Recovery / readiness (1–10)</span>
                    <select name="readiness" className={selectCls + " mt-2"}>
                      <option>10 — fully charged</option>
                      <option>8–9 — good to go</option>
                      <option>6–7 — solid</option>
                      <option>4–5 — dragging</option>
                      <option>1–3 — beat up</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">Wins &amp; PRs this week</span>
                  <textarea name="wins" rows={3} placeholder="What went well? Any new PRs or milestones?" className={inputCls + " mt-2 resize-none"} />
                </label>

                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">Struggles, pain, or things to flag</span>
                  <textarea name="struggles" rows={3} placeholder="Anything that felt off, nagging pain, missed sessions, life stress?" className={inputCls + " mt-2 resize-none"} />
                </label>

                <div>
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70 block mb-2">Form video (optional)</span>
                  <VideoUploader onUploaded={(url) => setVideoUrl(url)} />
                </div>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-2 bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 w-fit"
                >
                  {status === "submitting" ? "Sending…" : "Submit Check-In"}
                </button>

                {status === "error" && (
                  <p className="text-bone text-sm">Something went wrong sending your check-in. Try again in a moment.</p>
                )}
              </form>
            )}

            {/* Coach demo library */}
            <section className="mt-16 border-t border-bone/10 pt-12">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
                Coach&apos;s Video Library
              </p>
              <h2 className="glow font-display uppercase text-3xl font-700 leading-tight">
                Demos from your <span className="text-electric">coach.</span>
              </h2>
              {demos.length === 0 ? (
                <div className="mt-6 border-2 border-dashed border-bone/20 bg-ink/20 p-8 text-center">
                  <p className="font-display uppercase tracking-wider text-sm text-bone/50">No demo videos yet</p>
                  <p className="mt-2 text-xs text-bone/40">Your coach can post technique demos here — check back soon.</p>
                </div>
              ) : (
                <div className="mt-6 grid sm:grid-cols-2 gap-5">
                  {demos.map((d) => (
                    <div key={d.id} className="border border-bone/15 bg-ink/30 p-4">
                      <video src={d.url} controls className="w-full rounded bg-black max-h-56" preload="metadata" />
                      <div className="mt-3">
                        {d.category && (
                          <span className="inline-block font-display uppercase tracking-wider text-[10px] text-electric border border-electric/40 px-2 py-0.5 mb-2">
                            {d.category}
                          </span>
                        )}
                        {d.clientId && (
                          <span className="inline-block font-display uppercase tracking-wider text-[10px] text-bone/60 border border-bone/25 px-2 py-0.5 mb-2 ml-2">
                            For you
                          </span>
                        )}
                        <p className="font-display uppercase tracking-wider text-bone">{d.title}</p>
                        {d.description && <p className="mt-1 text-sm text-bone/60 leading-relaxed">{d.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Past check-ins + coach replies */}
            <section className="mt-16 border-t border-bone/10 pt-12">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
                Your Check-In History
              </p>
              {history.length === 0 ? (
                <div className="mt-6 border-2 border-dashed border-bone/20 bg-ink/20 p-8 text-center">
                  <p className="font-display uppercase tracking-wider text-sm text-bone/50">No check-ins yet</p>
                  <p className="mt-2 text-xs text-bone/40">Submit your first one above to start the conversation with your coach.</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-5">
                  {history.map((ci) => (
                    <CheckInCard key={ci.id} ci={ci} meId={meId} onReplied={loadFeeds} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function CheckInCard({ ci, meId, onReplied }: { ci: CheckIn; meId: string; onReplied: () => void }) {
  const [replyText, setReplyText] = useState("");
  const [replyVideo, setReplyVideo] = useState("");
  const [showVid, setShowVid] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendReply() {
    if (!replyText.trim() && !replyVideo) return;
    setSending(true);
    const res = await fetch("/api/checkins/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkinId: ci.id, text: replyText, videoUrl: replyVideo || null }),
    });
    setSending(false);
    if (res.ok) {
      setReplyText("");
      setReplyVideo("");
      setShowVid(false);
      onReplied();
    }
  }

  return (
    <div className="border border-bone/15 bg-ink/30 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="font-display uppercase tracking-wider text-bone">{ci.week || "Check-In"}</p>
        <span className="text-xs text-bone/40">{fmt(ci.createdAt)}</span>
      </div>
      {ci.readiness && <p className="mt-1 text-xs text-electric">Readiness: {ci.readiness}</p>}
      {ci.wins && (
        <p className="mt-3 text-sm text-bone/80"><span className="text-bone/50">Wins:</span> {ci.wins}</p>
      )}
      {ci.struggles && (
        <p className="mt-1 text-sm text-bone/80"><span className="text-bone/50">Struggles:</span> {ci.struggles}</p>
      )}
      {ci.video && (
        <video src={ci.video} controls className="mt-3 w-full max-h-64 rounded bg-black" preload="metadata" />
      )}

      {/* Legacy trainer note */}
      {ci.trainerNote && (
        <div className="mt-4 border-l-2 border-electric bg-electric/5 pl-4 py-2">
          <p className="font-display uppercase tracking-wider text-[10px] text-electric">Coach note</p>
          <p className="text-sm text-bone/80 mt-1 whitespace-pre-wrap">{ci.trainerNote}</p>
        </div>
      )}

      {/* Threaded replies */}
      {ci.replies && ci.replies.length > 0 && (
        <div className="mt-4 space-y-3">
          {ci.replies.map((r) => {
            const mine = r.authorId === meId;
            return (
              <div key={r.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                <div className={"max-w-[85%] px-4 py-2.5 " + (r.authorRole === "coach" ? "border border-electric/50 bg-electric/10 text-bone" : "bg-ink/60 border border-bone/15 text-bone")}>
                  <p className={"font-display uppercase tracking-wider text-[10px] mb-1 " + (r.authorRole === "coach" ? "text-electric" : "text-bone/50")}>
                    {r.authorRole === "coach" ? "Coach" : r.authorName}
                  </p>
                  {r.video && <video src={r.video} controls className="mb-2 max-h-56 rounded bg-black w-full" preload="metadata" />}
                  {r.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.text}</p>}
                  <p className="text-[10px] text-bone/40 mt-1">{fmt(r.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Member reply box */}
      <div className="mt-4 border-t border-bone/10 pt-4">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={2}
          placeholder="Reply to your coach…"
          className="w-full bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone focus:border-electric outline-none resize-none text-sm"
        />
        {showVid ? (
          <div className="mt-2">
            <VideoUploader onUploaded={(url) => setReplyVideo(url)} label="Attach a video reply" hint="MP4 / MOV, up to 500MB." />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowVid(true)}
            className="mt-2 font-display uppercase tracking-wider text-[11px] text-bone/60 border border-bone/25 px-3 py-1.5 hover:border-electric hover:text-electric transition-colors"
          >
            🎥 Add video
          </button>
        )}
        <div className="mt-2">
          <button
            type="button"
            onClick={sendReply}
            disabled={sending || (!replyText.trim() && !replyVideo)}
            className="bg-electric text-ink px-5 py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
