"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MacroCalculator from "@/components/tools/MacroCalculator";
import OneRepMaxCalculator from "@/components/tools/OneRepMaxCalculator";
import WilksDotsCalculator from "@/components/tools/WilksDotsCalculator";
import PRTracker from "@/components/tools/PRTracker";
import WorkoutLog from "@/components/tools/WorkoutLog";
import ExerciseLibrary from "@/components/ExerciseLibrary";
import WarmupLibrary from "@/components/WarmupLibrary";
import WeeklyPrograms from "@/components/WeeklyPrograms";
import HutchTouch from "@/components/HutchTouch";
import PRSubmit from "@/components/PRSubmit";
import TawkTo, { TAWK_CONFIGURED } from "@/components/TawkTo";
import { clientResources } from "@/data/client-resources";
import { CLIENT_PASSCODES } from "@/data/passcodes";

// ============================================================================
// CLIENT PORTAL — email + passcode gate
// ----------------------------------------------------------------------------
// This is a LIGHT GATE, not real security. The page is a static export with no
// server behind it, so the 100 passcodes and the gated content both live in
// the client-side source. A determined person could read them by viewing source.
//
// Fine for a "clients only" feel and non-sensitive resources. NOT for private
// personal data — that would require a backend with real account-based access.
//
// HOW IT WORKS:
//   - 100 unique passcodes are generated in src/data/passcodes.ts.
//   - Hutch emails ONE passcode to each approved member (from the download list).
//   - Members enter their email + the passcode at /clients to unlock the portal.
//   - On a successful unlock, a "Client Portal Login" event is fired to the lead
//     endpoint with the member's email + the passcode used, so Hutch can track
//     who is logging in — useful if he later switches to a real auth system.
//
// To rotate / replace passcodes: regenerate src/data/passcodes.ts and re-publish.
// ============================================================================
// Admin passcode — Hutch's own access. Works in addition to the 100 member codes.
const ADMIN_PASSCODE = "TheHutch33";

const LOGIN_TRACK_ENDPOINT =
  "https://alluring-encouragement-production.up.railway.app/public/lead_v3";

const resources = [
  {
    icon: "❖",
    title: "Training Guides",
    desc: "Accessory work, consistency, progressive overload — the reading behind the programming.",
    cta: "Read →",
    href: "/#content",
    external: false,
  },
];

type Status = "idle" | "submitting" | "success" | "error";

export default function ClientPortalPage() {
  const [entered, setEntered] = useState("");
  const [email, setEmail] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  // Weekly check-in form state
  const [status, setStatus] = useState<Status>("idle");

  // Client tools tab state
  const [tool, setTool] = useState<"macros" | "1rm" | "wilks" | "pr" | "log">("log");

  // Gate mode: "enter" (have a passcode) or "request" (ask for access)
  const [gateMode, setGateMode] = useState<"enter" | "request">("enter");
  const [requestStatus, setRequestStatus] = useState<Status>("idle");

  // Live chat readiness — true once Hutch adds his Tawk.to property ID
  const chatReady = TAWK_CONFIGURED;

  async function handleUnlock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = entered.trim();
    const code = raw.toUpperCase();
    const isAdmin = raw === ADMIN_PASSCODE;
    const ok =
      email.trim().length > 0 &&
      (isAdmin || CLIENT_PASSCODES.some((p) => p.toUpperCase() === code));
    if (!ok) {
      setError(true);
      return;
    }
    setError(false);
    setUnlocked(true);
    // Fire a tracking event so Hutch can see who logged in (email + passcode used).
    try {
      await fetch(LOGIN_TRACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: "",
          passcode: isAdmin ? "ADMIN" : code,
          source: isAdmin
            ? "Tensor Strength — Client Portal Admin Login"
            : "Tensor Strength — Client Portal Login",
        }),
      });
    } catch {
      /* tracking is best-effort; don't block the unlock */
    }
  }

  async function handleAccessRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRequestStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      coach: data.get("coach"),
      goal: data.get("goal"),
      source: "Tensor Strength — Client Portal Access Request",
    };

    try {
      const res = await fetch(
        "https://alluring-encouragement-production.up.railway.app/public/lead_v3",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Request failed");
      setRequestStatus("success");
      form.reset();
    } catch {
      setRequestStatus("error");
    }
  }

  async function handleCheckIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      week: data.get("week"),
      wins: data.get("wins"),
      struggles: data.get("struggles"),
      readiness: data.get("readiness"),
      source: "Tensor Strength — Client Check-In",
    };

    try {
      const res = await fetch(
        "https://alluring-encouragement-production.up.railway.app/public/lead_v3",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  const inputCls =
    "w-full bg-transparent border-b-2 border-bone/40 py-3 text-bone focus:border-electric outline-none";
  const selectCls =
    "w-full bg-ink/60 border-b-2 border-bone/40 py-3 text-bone focus:border-electric outline-none";

  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        {!unlocked ? (
          /* ---------- ACCESS GATE: enter passcode OR request access ---------- */
          <div className="max-w-md mx-auto text-center">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
              Client Portal
            </p>
            <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
              For active
              <br />
              <span className="text-electric">clients.</span>
            </h1>

            {gateMode === "enter" ? (
              <>
                <p className="mt-6 text-bone/70 leading-relaxed">
                  This area is for athletes currently training with Tensor Strength.
                  Enter the passcode Hutch sent you to access your resources and
                  weekly check-in.
                </p>

                <form onSubmit={handleUnlock} className="mt-10 text-left">
                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(false);
                      }}
                      required
                      autoFocus
                      placeholder="you@email.com"
                      className={inputCls + " mt-2"}
                    />
                  </label>
                  <label className="block mt-5">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                      Passcode
                    </span>
                    <input
                      type="password"
                      value={entered}
                      onChange={(e) => {
                        setEntered(e.target.value);
                        setError(false);
                      }}
                      required
                      placeholder="e.g. V6ZG-PPSS"
                      className={inputCls + " mt-2"}
                    />
                  </label>
                  {error && (
                    <p className="mt-3 text-sm text-electric">
                      Email and passcode don&apos;t match. Check both and try again.
                    </p>
                  )}
                  <button
                    type="submit"
                    className="mt-6 w-full bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
                  >
                    Enter Portal →
                  </button>
                </form>

                <p className="mt-8 text-xs text-bone/50 leading-relaxed">
                  Don&apos;t have a passcode?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setGateMode("request");
                      setError(false);
                    }}
                    className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors"
                  >
                    Request access
                  </button>
                  {" "}·{" "}
                  <a href="/#contact" className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors">
                    Apply for coaching
                  </a>
                </p>
              </>
            ) : (
              /* ---------- REQUEST ACCESS FORM ---------- */
              <>
                <p className="mt-6 text-bone/70 leading-relaxed">
                  Submit your details and Hutch will review your request. If it&apos;s a
                  fit, he&apos;ll email you the passcode to get in.
                </p>

                {requestStatus === "success" ? (
                  <div className="mt-10 border-2 border-electric bg-electric/10 p-8 text-left">
                    <p className="glow font-display uppercase text-lg text-electric text-center">
                      Access request received.
                    </p>
                    <p className="mt-3 text-bone/80 text-sm leading-relaxed text-center">
                      Hutch reviews every request himself. If you&apos;re a fit, you&apos;ll
                      get an email with the passcode to enter the portal. Keep an eye on
                      your inbox.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGateMode("enter");
                        setRequestStatus("idle");
                      }}
                      className="mt-6 w-full border-2 border-bone px-8 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone hover:text-ink transition-colors"
                    >
                      ← Back to passcode entry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAccessRequest} className="mt-10 text-left grid gap-5">
                    <label className="block">
                      <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                        Name
                      </span>
                      <input name="name" required className={inputCls + " mt-2"} />
                    </label>
                    <label className="block">
                      <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                        Email
                      </span>
                      <input name="email" type="email" required className={inputCls + " mt-2"} />
                    </label>
                    <label className="block">
                      <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                        Who do you want to train with?
                      </span>
                      <select name="coach" className={selectCls + " mt-2"}>
                        <option>Hutch</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                        What are you working toward?
                      </span>
                      <input name="goal" className={inputCls + " mt-2"} placeholder="e.g. Build strength, return from injury, first meet..." />
                    </label>

                    <button
                      type="submit"
                      disabled={requestStatus === "submitting"}
                      className="mt-2 w-full bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60"
                    >
                      {requestStatus === "submitting" ? "Sending…" : "Request Access"}
                    </button>

                    {requestStatus === "error" && (
                      <p className="text-sm text-electric">
                        Something went wrong sending your request. Try again, or apply for coaching first.
                      </p>
                    )}

                    <p className="text-xs text-bone/50 leading-relaxed">
                      Already have a passcode?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setGateMode("enter");
                          setRequestStatus("idle");
                        }}
                        className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors"
                      >
                        Enter it here
                      </button>
                      .
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        ) : (
          /* ---------- GATED CONTENT ---------- */
          <div>
            {/* Live chat widget — loads only for unlocked clients */}
            {chatReady && <TawkTo />}
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
              Client Portal
            </p>
            <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
              Welcome back.
              <br />
              <span className="text-electric">Let&apos;s work.</span>
            </h1>
            <p className="mt-6 text-bone/80 max-w-xl leading-relaxed">
              Everything you need to train, track, and check in with Hutch —
              calculators, the full workout log, exercise and warmup libraries,
              and your weekly check-in. All in one place.
            </p>

            {/* Live chat — 1:1 with Hutch (Tawk.to) */}
            <div className="mt-10 border-2 border-bone/15 bg-ink/30 backdrop-blur-sm p-6">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
                Live Chat
              </p>
              <div className="flex flex-col">
                <p className="font-display uppercase tracking-wider text-bone">
                  Ask Hutch a question
                </p>
                <p className="text-sm text-bone/60 mt-2 leading-relaxed">
                  Private 1:1 chat — use the floating chat button in the
                  bottom-right corner. Hutch replies directly.
                </p>
                <p className="mt-3 text-xs text-bone/40">
                  {chatReady
                    ? "Chat is online — tap the bubble to start."
                    : "Chat is being set up — check back shortly."}
                </p>
              </div>
            </div>

            {/* Weekly Programs — rotating, temporary member access */}
            <div className="mt-14 border-t border-bone/10 pt-12">
              <WeeklyPrograms mode="portal" />
            </div>

            {/* The Hutch Touch — full 8-week PPL block */}
            <div className="mt-14 border-t border-bone/10 pt-12">
              <HutchTouch mode="portal" />
            </div>

            {/* PR Board submission — clients submit PRs to the public board */}
            <div className="mt-14 border-t border-bone/10 pt-12">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Submit a PR
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                Hit a <span className="text-electric">PR?</span>
              </h2>
              <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                Send it through and Hutch will add it to the public PR Board on the next
                publish. First name, lift, result — that&apos;s it.
              </p>
              <div className="mt-8">
                <PRSubmit />
              </div>
            </div>

            {/* Resource cards */}
            <div className="mt-10 grid sm:grid-cols-2 gap-4">
              {resources.map((r) => (
                <a
                  key={r.title}
                  href={r.href}
                  {...(r.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="group border border-bone/15 bg-ink/30 backdrop-blur-sm p-6 hover:border-electric transition-colors flex flex-col"
                >
                  <span className="font-display text-3xl text-electric">{r.icon}</span>
                  <p className="font-display uppercase tracking-wider text-bone mt-4">
                    {r.title}
                  </p>
                  <p className="text-sm text-bone/60 mt-2 leading-relaxed flex-1">
                    {r.desc}
                  </p>
                  <p className="mt-4 font-display uppercase tracking-wider text-sm text-electric group-hover:text-bone transition-colors">
                    {r.cta}
                  </p>
                </a>
              ))}
            </div>

            {/* Client resources — PDFs dropped here for clients */}
            <div className="mt-14 border-t border-bone/10 pt-12">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Client Resources
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                Guides &amp; <span className="text-electric">downloads.</span>
              </h2>
              <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                Reference material from Hutch — program guides, orientation docs,
                and anything else you need to train smart.
              </p>

              {clientResources.length === 0 ? (
                <div className="mt-8 border-2 border-dashed border-bone/20 bg-ink/20 p-8 text-center">
                  <p className="font-display uppercase tracking-wider text-sm text-bone/50">
                    No resources posted yet
                  </p>
                  <p className="mt-2 text-xs text-bone/40">
                    Check back — Hutch drops new material here as you progress.
                  </p>
                </div>
              ) : (
                <ul className="mt-8 grid gap-3">
                  {clientResources.map((r) => (
                    <li key={r.url}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-4 border border-bone/15 bg-ink/30 backdrop-blur-sm p-5 hover:border-electric transition-colors"
                      >
                        <span className="font-display text-2xl text-electric shrink-0">📕</span>
                        <span className="min-w-0">
                          <span className="font-display uppercase tracking-wider text-bone block">
                            {r.title}
                          </span>
                          <span className="text-sm text-bone/60 mt-1 block leading-relaxed">
                            {r.description}
                          </span>
                          <span className="mt-3 inline-block font-display uppercase tracking-wider text-xs text-electric group-hover:text-bone transition-colors">
                            Open PDF →
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Client tools — workout log + macro tracker (not on public site) */}
            <div className="mt-14 border-t border-bone/10 pt-12">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Client Tools
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                Log the <span className="text-electric">work.</span>
              </h2>
              <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                The full toolkit — clients only. Calculators to estimate your
                maxes and scores, a PR tracker, the workout log, and a macro
                calculator. Everything saves right on your device.
              </p>

              <div className="flex flex-wrap gap-2 mb-6 mt-8 border-b border-bone/15 pb-2">
                {([
                  { id: "log", label: "Workout Log" },
                  { id: "macros", label: "Macro Calculator" },
                  { id: "1rm", label: "1-Rep Max" },
                  { id: "wilks", label: "Wilks & DOTS" },
                  { id: "pr", label: "PR Tracker" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    className={
                      "px-5 py-3 font-display uppercase tracking-wider text-sm transition-colors " +
                      (tool === t.id
                        ? "bg-electric text-ink"
                        : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="bg-ink/20 border border-bone/10 p-6 md:p-10">
                {tool === "log" && <WorkoutLog />}
                {tool === "macros" && <MacroCalculator />}
                {tool === "1rm" && <OneRepMaxCalculator />}
                {tool === "wilks" && <WilksDotsCalculator />}
                {tool === "pr" && <PRTracker />}
              </div>
            </div>

            {/* Exercise library — how-to + why it matters */}
            <div className="mt-14 border-t border-bone/10 pt-12">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Exercise Library
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                Move <span className="text-electric">right.</span>
              </h2>
              <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                How to do the main lifts properly — and why each one earns its place
                in your program. Tap any exercise for the full breakdown.
              </p>
              <div className="mt-8">
                <ExerciseLibrary />
              </div>
            </div>

            {/* Warmups & conditioning — plyo primers + no-equipment workouts */}
            <div className="mt-14 border-t border-bone/10 pt-12">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Warmups &amp; Conditioning
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                Prime the <span className="text-electric">engine.</span>
              </h2>
              <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                General warm-ups, plyometric primers and power sessions, isometric
                holds, and full no-equipment workouts for when you can&apos;t get
                to a gym. Tap any routine for the full breakdown.
              </p>
              <div className="mt-8">
                <WarmupLibrary />
              </div>
            </div>

            {/* Weekly check-in */}
            <div className="mt-14 border-t border-bone/10 pt-12">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Weekly Check-In
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                How did the <span className="text-electric">week go?</span>
              </h2>
              <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                Submit your check-in so Hutch can review your progress and adjust
                your program. Be honest — the work only works if it&apos;s real.
              </p>

              {status === "success" ? (
                <div className="mt-8 border-2 border-electric bg-ink/30 backdrop-blur-sm p-8 text-center">
                  <p className="glow font-display uppercase text-xl text-electric">
                    Check-in received.
                  </p>
                  <p className="mt-3 text-bone/80">
                    Thanks for the update — I&apos;ll review it and get back to you.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCheckIn} className="mt-8 grid gap-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                        Name
                      </span>
                      <input name="name" required className={inputCls + " mt-2"} />
                    </label>
                    <label className="block">
                      <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                        Email
                      </span>
                      <input name="email" type="email" required className={inputCls + " mt-2"} />
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                        Training week
                      </span>
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
                      <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                        Recovery / readiness (1–10)
                      </span>
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
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                      Wins &amp; PRs this week
                    </span>
                    <textarea
                      name="wins"
                      rows={3}
                      placeholder="What went well? Any new PRs or milestones?"
                      className={inputCls + " mt-2 resize-none"}
                    />
                  </label>

                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                      Struggles, pain, or things to flag
                    </span>
                    <textarea
                      name="struggles"
                      rows={3}
                      placeholder="Anything that felt off, nagging pain, missed sessions, life stress?"
                      className={inputCls + " mt-2 resize-none"}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="mt-2 bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 w-fit"
                  >
                    {status === "submitting" ? "Sending…" : "Submit Check-In"}
                  </button>

                  {status === "error" && (
                    <p className="text-bone text-sm">
                      Something went wrong sending your check-in. Try again, or
                      message Hutch directly via the chat button.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
        </div>
      </main>
      <Footer />
    </>
  );
}
