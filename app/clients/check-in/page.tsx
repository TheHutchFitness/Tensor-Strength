"use client";

import { useEffect, useState } from "react";
import PortalHeader from "@/components/portal/PortalHeader";

type Status = "idle" | "submitting" | "success" | "error";

export default function CheckInPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");

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
      setAuthorized(true);
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
      source: "Tensor Strength — Client Check-In",
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
          Weekly Check-In
        </p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          How did the <span className="text-electric">week go?</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
          Submit your check-in so your coach can review your progress and adjust
          your program. Be honest — the work only works if it&apos;s real.
        </p>

        {loading || !authorized ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">Loading…</p>
        ) : status === "success" ? (
          <div className="mt-8 border-2 border-electric bg-ink/30 backdrop-blur-sm p-8 text-center">
            <p className="glow font-display uppercase text-xl text-electric">Check-in received.</p>
            <p className="mt-3 text-bone/80">Thanks for the update — your coach will review it and get back to you.</p>
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
      </div>
    </main>
  );
}
