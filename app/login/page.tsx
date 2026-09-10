"use client";

import { useEffect, useState } from "react";
import { GOAL_OPTIONS } from "@/data/gamification";

type Mode = "login" | "register";

function slugifyUsername(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
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
  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  // Tick down the rate-limit cooldown once per second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Invite flow: /login?signup=1&email=...&name=... opens the register form
  // prefilled with the applicant's details (used by the Admin "invite" button).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup") === "1" || params.get("mode") === "register") {
      setMode("register");
    }
    const em = params.get("email");
    if (em) setEmail(em);
    const nm = params.get("name");
    if (nm) setUsername(slugifyUsername(nm));
  }, []);

  const inputCls =
    "w-full bg-transparent border-b-2 border-bone/40 py-3 text-bone focus:border-electric outline-none";

  function signInWithGoogle() {
    // Remember where the user wanted to go, then hand off to Emergent-managed auth.
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    if (from) sessionStorage.setItem("ts_login_from", from);
    const callback = `${window.location.origin}/auth/emergent/callback`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callback)}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cooldown > 0) return;
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
      // Success — save signup goals (new members), then redirect.
      if (mode === "register" && goals.length) {
        await fetch("/api/gamification/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goals }),
        }).catch(() => {});
      }
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from") || (mode === "register" ? "/quests" : "/");
      window.location.href = from;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="text-bone min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-10">
          <img
            src="/tensor-strength-logo.jpg"
            alt="Tensor Strength"
            className="h-20 w-20 object-contain rounded-full mb-6"
          />
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-3">
            Tensor Strength
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            {mode === "login" ? (
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
            {mode === "login"
              ? "Sign in to access the site and your training."
              : "Create your account to get in. The Client Portal unlocks once Hutch approves you."}
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

          {mode === "register" && (
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
                        : "border-bone/20 text-bone/60 hover:border-bone/40")
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-electric">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : mode === "login"
              ? "Sign In →"
              : "Create Account →"}
          </button>

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

        <div className="mt-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-bone/15" />
          <span className="font-display uppercase tracking-wider text-[10px] text-bone/40">or</span>
          <span className="h-px flex-1 bg-bone/15" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-6 w-full flex items-center justify-center gap-3 border-2 border-bone/25 bg-bone text-ink px-8 py-3.5 font-display uppercase tracking-wider hover:bg-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-bone/60">
          {mode === "login" ? "New here? " : "Already have an account? "}
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

        <div className="mt-6 border-t border-bone/10 pt-5 text-center">
          <p className="text-sm text-bone/60 leading-relaxed">
            In-person training is only available at{" "}
            <a
              href="https://thefiteffectparis.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors font-display uppercase tracking-wider"
            >
              The Fit Effect
            </a>{" "}
            in Paris, Ontario.
          </p>
        </div>
      </div>
    </main>
  );
}
