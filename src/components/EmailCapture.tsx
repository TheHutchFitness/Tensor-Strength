"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function EmailCapture() {
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      email: data.get("email"),
      name: "",
      source: "Tensor Strength — Weekly Tip Newsletter Signup",
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
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section className="py-16 md:py-20 relative overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-6">
          <div className="border-2 border-electric bg-electric/10 p-8 md:p-10 text-center">
            <p className="glow font-display uppercase text-xl text-electric">You&apos;re in.</p>
            <p className="mt-3 text-bone/80 leading-relaxed text-sm">
              First tip lands in your inbox soon. No spam — just one useful idea a week.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-6">
        <div className="border-2 border-bone/15 bg-ink/30 backdrop-blur-sm p-8 md:p-10">
          <div className="text-center max-w-xl mx-auto">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
              The Weekly Drop
            </p>
            <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
              One training tip,
              <br />
              <span className="text-electric">every week.</span>
            </h2>
            <p className="mt-5 text-bone/70 leading-relaxed text-sm">
              Free. No fluff. One idea you can actually use in your next session —
              programming, technique, mindset. Drop your email and it lands every week.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="flex-1 bg-ink/40 border border-bone/20 px-4 py-3 text-bone focus:border-electric outline-none"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {status === "submitting" ? "Subscribing…" : "Get the Tip →"}
            </button>
          </form>

          {status === "error" && (
            <p className="mt-4 text-center text-bone text-sm">
              Something went wrong signing you up. Try again, or apply for coaching and
              we&apos;ll add you manually.
            </p>
          )}

          <p className="mt-5 text-center text-[11px] text-bone/40 leading-relaxed">
            No spam. Unsubscribe anytime. Your email stays with Tensor Strength.
          </p>
        </div>
      </div>
    </section>
  );
}
