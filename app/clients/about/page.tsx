"use client";

import { useEffect, useState } from "react";
import PortalHeader from "../../../src/components/portal/PortalHeader";

const EMPTY = {
  squat: "",
  bench: "",
  deadlift: "",
  overheadPress: "",
  diet: "",
  gym: "",
  workoutsPerWeek: "",
  activityLevel: "",
  restingHeartRate: "",
  currentCalories: "",
  notes: "",
};

export default function AboutMePage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({ ...EMPTY });

  async function loadProfile() {
    setLoading(true);
    setLoadError("");
    try {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        window.location.href = "/login?from=/clients/about";
        return;
      }
      const { user } = await me.json();
      if (!user.portalAccess && !user.isTrainer) { window.location.href = "/clients"; return; }
      const profileResponse = await fetch("/api/client/profile");
      if (!profileResponse.ok) throw new Error("Could not load profile");
      const prof = await profileResponse.json();
      if (prof.profile) setForm({ ...EMPTY, ...prof.profile });
      setAuthorized(true);
    } catch {
      setLoadError("Your profile could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Could not save profile");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Your profile could not be saved. Your changes are still here—please try again.");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone mt-1 focus:border-electric outline-none";
  const labelCls = "text-[10px] uppercase tracking-wider text-bone/50";

  return (
    <main className="text-bone min-h-screen">
      <PortalHeader />
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
          Client Portal
        </p>
        <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          About <span className="text-electric">me.</span>
        </h1>
        <p className="mt-4 text-bone/70 leading-relaxed max-w-2xl">
          Fill this out so your coach knows your numbers and how you train. It
          helps them build the right program for you.
        </p>

        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem("ts_login_from", "/clients/about");
            const cb = `${window.location.origin}/auth/emergent/callback`;
            window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(cb)}`;
          }}
          className="mt-5 inline-flex items-center gap-2 border border-bone/25 bg-bone text-ink px-4 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Connect Google (same email)
        </button>

        {loading ? (
          <p className="mt-12 font-display uppercase tracking-wider text-bone/50">Loading…</p>
        ) : loadError ? (
          <div className="mt-8 border border-bone/20 bg-ink/30 p-6">
            <p className="text-sm text-bone/80">{loadError}</p>
            <button onClick={() => void loadProfile()} className="mt-4 bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">Retry</button>
          </div>
        ) : !authorized ? null : (
          <form onSubmit={save} className="mt-10 grid gap-6">
            <div>
              <p className="font-display uppercase tracking-wider text-electric text-sm mb-3">Big 4 lift PRs</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="block"><span className={labelCls}>Squat</span>
                  <input value={form.squat} onChange={(e) => set("squat", e.target.value)} placeholder="e.g. 315 lb" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Bench</span>
                  <input value={form.bench} onChange={(e) => set("bench", e.target.value)} placeholder="e.g. 225 lb" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Deadlift</span>
                  <input value={form.deadlift} onChange={(e) => set("deadlift", e.target.value)} placeholder="e.g. 405 lb" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Overhead Press</span>
                  <input value={form.overheadPress} onChange={(e) => set("overheadPress", e.target.value)} placeholder="e.g. 135 lb" className={inputCls} /></label>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className={labelCls}>Diet</span>
                <select value={form.diet} onChange={(e) => set("diet", e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2.5 text-bone mt-1 focus:border-electric outline-none">
                  <option value="">Select…</option>
                  <option>Balanced</option>
                  <option>Vegetarian</option>
                  <option>Vegan</option>
                  <option>Keto</option>
                  <option>Carnivore</option>
                </select>
              </label>
              <label className="block"><span className={labelCls}>Home gym</span>
                <input value={form.gym} onChange={(e) => set("gym", e.target.value)} placeholder="Where do you train?" className={inputCls} /></label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className={labelCls}>Preferred workouts / week</span>
                <select value={form.workoutsPerWeek} onChange={(e) => set("workoutsPerWeek", e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2.5 text-bone mt-1 focus:border-electric outline-none">
                  <option value="">Select…</option>
                  {["2", "3", "4", "5", "6", "7"].map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
              <label className="block"><span className={labelCls}>Activity level</span>
                <select value={form.activityLevel} onChange={(e) => set("activityLevel", e.target.value)} className="w-full bg-ink/60 border border-bone/20 px-3 py-2.5 text-bone mt-1 focus:border-electric outline-none">
                  <option value="">Select…</option>
                  <option>Sedentary</option>
                  <option>Lightly active</option>
                  <option>Moderately active</option>
                  <option>Very active</option>
                  <option>Athlete</option>
                </select>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className={labelCls}>Resting heart rate (bpm)</span>
                <input value={form.restingHeartRate} onChange={(e) => set("restingHeartRate", e.target.value)} placeholder="e.g. 58" className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Current daily calorie intake</span>
                <input value={form.currentCalories} onChange={(e) => set("currentCalories", e.target.value)} placeholder="e.g. 2400 kcal" className={inputCls} /></label>
            </div>

            <label className="block"><span className={labelCls}>Anything else for your coach</span>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Injuries, goals, schedule, preferences…" className={inputCls + " resize-none"} /></label>

            <div className="flex items-center gap-4">
              <button type="submit" disabled={saving} className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60">
                {saving ? "Saving…" : "Save Profile"}
              </button>
              {saved && <span className="font-display uppercase tracking-wider text-sm text-electric">✓ Saved — your coach can see this.</span>}
            </div>
            {saveError && <p role="alert" className="text-sm text-bone/80">{saveError}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
