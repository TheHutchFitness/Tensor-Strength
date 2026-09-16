"use client";

import { useEffect, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";

// Coach's Google Calendar "Appointment schedule" booking pages (public booking links).
// To change these later, just update the two IDs below.
const SCHEDULES = {
  inperson: "AcZssZ3XT5bEpAZExk-M3ksQylwSCzwDP8vA4miNw97dqfe9kwA2TIeQG2FtkWx5QXYD-urnVE7f0Wfx",
  remote: "AcZssZ3Gf8Eth6w_u5uaQUIwwBdRh_Nb01nbQBa8jwLtfw3_d8urusi8F177CdMgH2b9VrGBs5CjRW8Q",
};
const embedUrl = (id: string) => `https://calendar.google.com/calendar/appointments/schedules/${id}?gv=true`;
const openUrl = (id: string) => `https://calendar.google.com/calendar/appointments/schedules/${id}`;

export default function BookPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"inperson" | "remote">("inperson");
  const [accessType, setAccessType] = useState<string>("");

  useEffect(() => {
    // Deep-link to a specific schedule, e.g. /clients/book?type=remote
    const t = new URLSearchParams(window.location.search).get("type");
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) { window.location.href = "/login?from=/clients/book"; return; }
      const { user } = await me.json();
      if (!user.portalAccess) { window.location.href = "/clients"; return; }
      setAccessType(user.accessType || "");
      // Default to the schedule matching the client's plan (URL param wins).
      if (t === "remote" || t === "inperson") setTab(t);
      else if (user.accessType === "remote_coaching") setTab("remote");
      else if (user.accessType === "in_person") setTab("inperson");
      setLoading(false);
    })();
  }, []);

  const coachingClient = accessType === "remote_coaching" || accessType === "in_person";

  const id = SCHEDULES[tab];

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

            <div className="border border-bone/15 bg-white/95 overflow-hidden">
              <iframe
                key={tab}
                src={embedUrl(id)}
                title={tab === "inperson" ? "In-person booking" : "Remote booking"}
                className="w-full"
                style={{ border: 0, minHeight: 640 }}
                width="100%"
                height={720}
              />
            </div>

            {tab === "remote" && (
              <p className="mt-3 text-xs text-electric/90 leading-relaxed border-l-2 border-electric pl-3">
                📌 One remote check-in per week, please — book the slot that works and I&apos;ll see you on Google Meet.
              </p>
            )}

            <p className="mt-4 text-xs text-bone/50 leading-relaxed">
              Trouble loading the calendar?{" "}
              <a href={openUrl(id)} target="_blank" rel="noopener noreferrer" className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors">
                Open the booking page in a new tab →
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
