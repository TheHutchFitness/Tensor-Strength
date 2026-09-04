"use client";

import { useState } from "react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full bg-transparent border-b-2 border-bone/40 py-3 text-bone focus:border-electric outline-none";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { username, password }
          : { username, email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      // Success — redirect to the intended page or home
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from") || "/";
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
        </form>

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
      </div>
    </main>
  );
}
