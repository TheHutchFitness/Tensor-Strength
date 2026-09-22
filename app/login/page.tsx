"use client";

import { useEffect, useState } from "react";
import { safeReturnPath } from "../../src/lib/workoutMetrics";
import { checkoutPath, getPlan } from "../../src/lib/plans";
import { GOAL_OPTIONS } from "../../src/data/gamification";

type Mode = "login" | "register";

function slugifyUsername(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}

function checkoutDestination(params: URLSearchParams, mode: Mode) {
  const plan = params.get("plan");
  const from = params.get("from") || "";
  if (plan) return checkoutPath(plan, true);
  if (from.startsWith("/checkout")) return safeReturnPath(from, checkoutPath("monthly_9_99", true));
  return safeReturnPath(from, mode === "register" ? "/quests" : "/clients");
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from") || "";
    const buying = Boolean(params.get("plan") || from.startsWith("/checkout"));
    if (params.get("signup") === "1" || params.get("mode") === "register" || buying) {
      setMode("register");
    }
    if (buying) setPlanId(getPlan(params.get("plan")).id);
    const em = params.get("email");
    if (em) setEmail(em);
    const nm = params.get("name");
    if (nm) setUsername(slugifyUsername(nm));
  }, []);

  useEffect(() => {
    fetch("/api/signup-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setRegistrationOpen(data.registrationOpen !== false);
          setRegistrationMessage(data.message || "");
        }
      })
      .catch(() => {});
  }, []);

  const inputCls =
    "w-full bg-transparent border-b border-line py-3 text-bone focus:border-electric outline-none transition-colors";
  const plan = planId ? getPlan(planId) : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cooldown > 0) return;
    if (mode === "register" && !registrationOpen) {
      setError(registrationMessage || "Registration is currently by invitation only.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { username, password }
          : { username, email, password, demoSource: typeof window !== "undefined" ? localStorage.getItem("ts_last_demo") : null };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          const wait = Number(data.retryAfter) || Number(res.headers.get("Retry-After")) || 60;
          setCooldown(wait);
          setError("");
        } else {
          setError(data.error || "Something went wrong. Try again.");
        }
        setLoading(false);
        return;
      }
      if (mode === "register" && goals.length) {
        await fetch("/api/gamification/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goals }),
        }).catch(() => {});
      }
      const params = new URLSearchParams(window.location.search);
      window.location.href = checkoutDestination(params, mode);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="text-bone min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md relative border border-line bg-ink/50 backdrop-blur px-7 py-10 sm:px-9">
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric to-transparent opacity-70" />
        <div className="flex flex-col items-center text-center mb-10">
          <img
            src="/tensor-strength-logo.jpg"
            alt="Tensor Strength"
            className="h-20 w-20 object-contain rounded-full mb-6"
          />
          <p className="flex items-center gap-3 font-display uppercase tracking-[0.22em] text-[11px] text-steel mb-4">
            <span className="h-px w-8 bg-electric" />
            Tensor Strength
          </p>
          <h1 className="font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            {plan ? (
              <>
                Then
                <br />
                <span className="text-electric">pay {plan.price}.</span>
              </>
            ) : mode === "login" ? (
              <>
                Members
                <br />
                <span className="text-electric">only.</span>
              </>
            ) : (
              <>
                Join the
                <br />
                <span className="text-electric">roster.</span>
              </>
            )}
          </h1>
          <p className="mt-5 text-bone/70 leading-relaxed">
            {plan
              ? `Create your account, then pay ${plan.price}${plan.cadence}. Portal opens as soon as Stripe confirms — no wait for approval.`
              : mode === "login"
                ? "Sign in to access the site and your training."
                : "Create a free account. Upgrade to $9.99/mo whenever you want the full portal."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">
              {mode === "login" ? "Username or email" : "Username"}
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder={mode === "login" ? "you or you@email.com" : "choose a username"}
              className={inputCls + " mt-2"}
            />
          </label>

          {mode === "register" && registrationOpen && (
            <label className="block">
              <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@email.com"
                className={inputCls + " mt-2"}
              />
            </label>
          )}

          <label className="block">
            <span className="font-display uppercase tracking-wider text-xs text-bone/70">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={mode === "register" ? "6+ characters" : "••••••••"}
              className={inputCls + " mt-2"}
            />
          </label>

          {mode === "register" && (
            <div>
              <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                Your goals <span className="text-bone/40">(pick any — powers your quests)</span>
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGoal(g)}
                    className={
                      "px-3 py-2 font-display uppercase tracking-wider text-[11px] border transition-colors " +
                      (goals.includes(g)
                        ? "border-electric bg-electric/10 text-electric"
                        : "border-line text-bone/60 hover:border-bone/40")
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-electric">{error}</p>}

          {mode === "register" && !registrationOpen ? (
            <div className="mt-2 border border-electric/40 bg-electric/5 px-4 py-3 text-sm text-bone/75 leading-relaxed">
              {registrationMessage || "Registration is currently by invitation only. Apply for coaching to start a conversation."}
              <a href="/apply" className="block mt-2 font-display uppercase tracking-wider text-xs text-electric hover:text-bone">Apply for coaching →</a>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign In →"
                  : plan
                    ? "Create account — then pay"
                    : "Create Account →"}
            </button>
          )}

          {mode === "login" && (
            <p className="mt-3 text-center text-xs text-bone/50">
              Forgot your password?{" "}
              <a
                href="mailto:the9hutch@gmail.com?subject=Password%20reset%20request"
                className="text-electric hover:underline"
              >
                Ask your coach to reset it
              </a>
            </p>
          )}
        </form>

        <p className="mt-8 text-center text-sm text-bone/60">
          {mode === "login" ? "New here? " : "Already have an account? "}
          {mode === "login" && !registrationOpen ? (
            <a href="/apply" className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors font-display uppercase tracking-wider">Apply for coaching</a>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors font-display uppercase tracking-wider"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          )}
        </p>

        <p className="mt-6 text-center text-sm text-bone/50">
          Just want to train?{" "}
          <a
            href="/free-programs"
            className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors font-display uppercase tracking-wider"
          >
            Browse free programs
          </a>{" "}
          — no sign-up needed.
        </p>
      </div>
    </main>
  );
}
