"use client";

import { useEffect, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";

// Coach's Google Calendar booking links (public "Book an appointment" share links).
// To change these later, just update the two URLs below.
const BOOKING = {
  inperson: "https://calendar.app.google/uGhFiQJRDEeehvMy8",
  remote: "https://calendar.app.google/Z6WBxXeckLBQiqdB7",
};

export default function BookPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<"inperson" | "remote">("inperson");
  const [accessType, setAccessType] = useState<string>("");

  async function loadBooking() {
    setLoading(true);
    setLoadError("");
    // Deep-link to a specific schedule, e.g. /clients/book?type=remote
    const t = new URLSearchParams(window.location.search).get("type");
    try {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        const from = `/clients/book${window.location.search}`;
        window.location.href = `/login?from=${encodeURIComponent(from)}`;
        return;
      }
      const { user } = await me.json();
      if (!user.portalAccess) { window.location.href = "/clients"; return; }
      setAccessType(user.accessType || "");
      if (t === "remote" || t === "inperson") setTab(t);
      else if (user.accessType === "remote_coaching") setTab("remote");
      else if (user.accessType === "in_person") setTab("inperson");
    } catch {
      setLoadError("Your booking options could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBooking();
  }, []);

  const coachingClient = accessType === "remote_coaching" || accessType === "in_person";
  const url = BOOKING[tab];

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-16">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">Book a Session</p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          Grab your <span className="text-electric">slot.</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
          Pick a time that works for you. In-person sessions happen at the gym; remote check-ins include an
          automatic Google Meet link so we can connect from anywhere.
        </p>

        {loading ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">Loading…</p>
        ) : loadError ? (
          <div className="mt-8 border border-bone/20 bg-ink/30 p-6">
            <p className="text-sm text-bone/80">{loadError}</p>
            <button onClick={() => void loadBooking()} className="mt-4 bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">Retry</button>
          </div>
        ) : !coachingClient ? (
          <div className="mt-8 border-2 border-electric/40 bg-electric/5 p-8">
            <p className="font-display uppercase tracking-wider text-electric">1:1 sessions are for coaching clients</p>
            <p className="mt-2 text-bone/70 text-sm leading-relaxed max-w-xl">
              Booking in-person sessions and remote video check-ins is included with{" "}
              <span className="text-bone">In-Person</span> or <span className="text-bone">Remote Coaching</span>.
              Upgrade your plan and you&apos;ll be able to book right here.
            </p>
            <a href="/account" className="mt-5 inline-block bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">
              View coaching plans →
            </a>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mt-8 mb-6 border-b border-bone/15 pb-2">
              {([["inperson", "🏋️ In-Person Training"], ["remote", "💻 Remote Check-in"]] as const).map(([id2, label]) => (
                <button
                  key={id2}
                  onClick={() => setTab(id2)}
                  className={"px-5 py-3 font-display uppercase tracking-wider text-sm transition-colors " + (tab === id2 ? "bg-electric text-ink" : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="border-2 border-electric/40 bg-electric/[0.04] p-8">
              {tab === "inperson" ? (
                <>
                  <p className="font-display uppercase tracking-wider text-electric text-lg">1-on-1 In-Person Floor Sessions</p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-bone/50">Location: The Fit Effect — Paris, Ontario</p>
                  <p className="mt-3 text-bone/75 leading-relaxed max-w-xl">
                    Direct, hands-on strength coaching designed to dial in your technique, enforce progressive
                    overload, and push your training intensity safely.
                  </p>
                  <div className="mt-4 border-l-2 border-electric bg-electric/5 pl-4 py-3 max-w-xl">
                    <p className="font-display uppercase tracking-wider text-[11px] text-electric">⚠️ Important Booking Requirements</p>
                    <p className="mt-1.5 text-xs text-bone/70 leading-relaxed">
                      This scheduling page is strictly for active members of The Fit Effect who have already purchased
                      personal training packages or sessions through the facility. If you are not yet a member or have
                      not purchased training credits, please contact me or the front desk staff at The Fit Effect
                      before booking.
                    </p>
                  </div>
                  <p className="mt-4 text-sm text-bone/70"><span className="text-bone/50 font-display uppercase tracking-wider text-xs">Available days:</span> Monday, Wednesday &amp; Friday · 4:30 PM – 7:30 PM</p>
                </>
              ) : (
                <>
                  <p className="font-display uppercase tracking-wider text-electric text-lg">Schedule Your Weekly Check-In</p>
                  <p className="mt-3 text-bone/75 leading-relaxed max-w-xl">
                    Select an available slot to lock in your 1-on-1 weekly review. All sessions take place via
                    Google Meet — you&apos;ll receive the video invite and calendar link instantly once scheduled.
                  </p>
                </>
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 bg-electric text-ink px-7 py-3.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors"
              >
                {tab === "inperson" ? "Schedule Your Floor Session →" : "Book via Google Calendar →"}
              </a>
            </div>

            {tab === "remote" && (
              <p className="mt-4 text-xs text-electric/90 leading-relaxed border-l-2 border-electric pl-3">
                📌 One remote check-in per week — please book your slot before Sunday so we stay on schedule.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
