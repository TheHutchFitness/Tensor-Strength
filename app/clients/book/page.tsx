"use client";

import { useEffect, useState } from "react";
import PortalHeader from "@/components/portal/PortalHeader";

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

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) { window.location.href = "/login?from=/clients/book"; return; }
      const { user } = await me.json();
      if (!user.portalAccess) { window.location.href = "/clients"; return; }
      setLoading(false);
    })();
  }, []);

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
