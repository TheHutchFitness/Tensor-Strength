"use client";

import { useState } from "react";

const FOCUS_OPTIONS = [
  { value: "remote", label: "Remote coaching" },
  { value: "in_person", label: "In-person (The Fit Effect, Paris ON)" },
  { value: "custom", label: "One-off custom program" },
  { value: "not_sure", label: "Not sure yet — help me choose" },
];

const EXPERIENCE_OPTIONS = [
  { value: "new", label: "New to lifting (< 1 year)" },
  { value: "intermediate", label: "Intermediate (1–3 years)" },
  { value: "experienced", label: "Experienced (3–5 years)" },
  { value: "advanced", label: "Advanced (5+ years)" },
];

const inputClass =
  "w-full bg-ink/60 border border-bone/20 focus:border-electric focus:ring-1 focus:ring-electric outline-none px-4 py-3 text-bone placeholder:text-bone/30 transition-colors";

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    focus: "",
    experience: "",
    goals: "",
    injuries: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="text-bone py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-6">
        <p className="glow font-display uppercase tracking-[0.3em] text-bone/70 text-sm mb-6">
          Apply for Coaching
        </p>
        <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          Ready to put
          <br />
          in the <span className="text-electric">work?</span>
        </h2>
        <p className="mt-6 text-bone/80 max-w-xl leading-relaxed">
          Tell me where you are and where you want to be. I review every application
          myself and reply to the ones I can genuinely help.
        </p>

        {status === "done" ? (
          <div className="mt-10 border-2 border-electric bg-ink/50 backdrop-blur-sm p-8 text-center">
            <p className="font-display uppercase text-2xl text-electric mb-3">
              Application received
            </p>
            <p className="text-bone/80 leading-relaxed max-w-md mx-auto">
              Thanks, {form.name.split(" ")[0] || "there"}. I review every application
              myself and reply within 48 hours to the ones I can genuinely help. Keep
              an eye on <span className="text-bone">{form.email}</span>.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-10 border-2 border-electric/30 bg-ink/40 backdrop-blur-sm p-6 sm:p-8 space-y-5"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-bone/60 mb-2">
                  Name *
                </label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-bone/60 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@email.com"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-bone/60 mb-2">
                  Phone (optional)
                </label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-bone/60 mb-2">
                  What are you after?
                </label>
                <select
                  className={inputClass}
                  value={form.focus}
                  onChange={(e) => update("focus", e.target.value)}
                >
                  <option value="">Select…</option>
                  {FOCUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-bone/60 mb-2">
                Training experience
              </label>
              <select
                className={inputClass}
                value={form.experience}
                onChange={(e) => update("experience", e.target.value)}
              >
                <option value="">Select…</option>
                {EXPERIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-bone/60 mb-2">
                Your goals — where do you want to be?
              </label>
              <textarea
                className={`${inputClass} min-h-[120px] resize-y`}
                value={form.goals}
                onChange={(e) => update("goals", e.target.value)}
                placeholder="Competing, getting stronger, building muscle, staying healthy… tell me the target and your timeline."
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-bone/60 mb-2">
                Injuries or limitations (optional)
              </label>
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={form.injuries}
                onChange={(e) => update("injuries", e.target.value)}
                placeholder="Anything I should know before programming for you."
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 font-display uppercase tracking-wider">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full sm:w-auto bg-electric text-ink px-10 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "sending" ? "Sending…" : "Submit application →"}
            </button>

            <p className="text-[11px] text-bone/40 leading-relaxed">
              Submitting is free — no payment is taken and no account is needed. I review
              every application myself and reply within 48 hours.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
