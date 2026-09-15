"use client";

import { useEffect, useState } from "react";
import PortalHeader from "@/components/portal/PortalHeader";

const FIELDS: [string, string, string][] = [
  ["goal", "Primary goal", "e.g. Build muscle, get stronger, lose fat"],
  ["injuries", "Injuries / limitations", "Anything I should train around?"],
  ["workoutsPerWeek", "Workouts per week", "e.g. 4"],
  ["activityLevel", "Daily activity level", "Sedentary / Active / Very active"],
  ["gym", "Where do you train?", "Gym name or home setup"],
  ["diet", "Diet / nutrition notes", "Preferences, allergies, current approach"],
  ["squat", "Squat (best)", "e.g. 315 x 3"],
  ["bench", "Bench (best)", "e.g. 225 x 5"],
  ["deadlift", "Deadlift (best)", "e.g. 405 x 1"],
  ["overheadPress", "Overhead press (best)", "e.g. 135 x 5"],
  ["restingHeartRate", "Resting heart rate", "bpm (optional)"],
  ["currentCalories", "Current daily calories", "if you track (optional)"],
];

export default function IntakePage() {
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) { window.location.href = "/login?from=/clients/intake"; return; }
      const { user } = await me.json();
      if (!user.portalAccess) { window.location.href = "/clients"; return; }
      const p = await fetch("/api/client/profile").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (p?.profile) setF(p.profile);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/client/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, notes: f.notes || "" }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => { window.location.href = "/clients"; }, 1200); }
  }

  const input = "w-full bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone focus:border-electric outline-none text-sm";

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">Welcome — Let&apos;s Get Started</p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          Your <span className="text-electric">intake.</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
          A few quick details so I can tailor your training and nutrition. This powers your program,
          targets and progress tracking — takes about 2 minutes.
        </p>

        {loading ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">Loading…</p>
        ) : saved ? (
          <div className="mt-8 border-2 border-electric bg-electric/10 p-8 text-center">
            <p className="glow font-display uppercase text-xl text-electric">Thanks — you&apos;re all set!</p>
            <p className="mt-2 text-bone/80">Taking you to your portal…</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELDS.map(([key, label, ph]) => (
                <label key={key} className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">{label}</span>
                  <input value={f[key] || ""} onChange={(e) => setF((s) => ({ ...s, [key]: e.target.value }))} placeholder={ph} className={input + " mt-2"} />
                </label>
              ))}
            </div>
            <label className="block">
              <span className="font-display uppercase tracking-wider text-xs text-bone/70">Anything else I should know?</span>
              <textarea value={f.notes || ""} onChange={(e) => setF((s) => ({ ...s, notes: e.target.value }))} rows={3} className={input + " mt-2 resize-none"} />
            </label>
            <div className="flex items-center gap-4 mt-2">
              <button onClick={save} disabled={saving} className="bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60">
                {saving ? "Saving…" : "Save & Continue"}
              </button>
              <a href="/clients" className="font-display uppercase tracking-wider text-xs text-bone/50 hover:text-electric transition-colors">Skip for now</a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
