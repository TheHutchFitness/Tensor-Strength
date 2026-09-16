"use client";

import { useState } from "react";
import { LEAD_CAPTURE_URL } from "../lib/public-links";

type Status = "idle" | "submitting" | "success" | "error";

const included = [
  "Custom-built training program tailored to your goals, schedule, and equipment",
  "Strength + accessory work programmed around your lifts and weak points",
  "Progressive overload scheme and deload built in",
  "Exercise selection matched to your gear (home gym, commercial, powerlifting focus, etc.)",
  "Direct follow-up so we're aligned on the plan before you start",
];

export default function CustomProgram() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      age: data.get("age"),
      bodyweight: data.get("bodyweight"),
      goal: data.get("goal"),
      history: data.get("history"),
      equipment: data.get("equipment"),
      timeline: data.get("timeline"),
      source: "Tensor Strength — Custom Program Request ($200)",
    };

    try {
      const res = await fetch(
        LEAD_CAPTURE_URL,
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
    "w-full bg-ink/40 border border-bone/20 px-3 py-2 text-bone focus:border-electric outline-none";

  return (
    <section id="program" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Pitch */}
          <div>
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
              Custom Program
            </p>
            <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
              A program built
              <br />
              for <span className="text-electric">you.</span>
            </h2>
            <p className="mt-8 text-lg text-bone/80 leading-relaxed max-w-xl">
              Not a template. Not a guess. A training program designed around your body, your
              goals, and the equipment you actually have — built by Hutch and delivered to you.
            </p>

            <div className="mt-8 inline-flex flex-col items-start bg-electric/10 border-2 border-electric px-6 py-4">
              <span className="font-display uppercase tracking-wider text-xs text-bone/60">
                Investment
              </span>
              <span className="font-display text-4xl text-electric font-700 leading-none mt-1">
                $200
              </span>
              <span className="text-xs text-bone/60 mt-1">One-time · custom-built program</span>
            </div>

            <ul className="mt-8 grid gap-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-electric font-display mt-0.5">⚡</span>
                  <span className="text-bone/80 leading-relaxed text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs text-bone/50 leading-relaxed max-w-md">
              How it works: submit the application on the right. If it&apos;s a fit, I&apos;ll
              reach out to confirm details and send a payment request for the $200. Once
              that&apos;s taken care of, I build your program.
            </p>
          </div>

          {/* Form */}
          <div className="bg-ink/40 border border-bone/15 p-6 md:p-8">
            {status === "success" ? (
              <div className="text-center py-10">
                <p className="glow font-display uppercase text-2xl text-electric">Application received.</p>
                <p className="mt-3 text-bone/80 leading-relaxed">
                  Check your inbox — I&apos;ll review your details and reach out with next steps
                  and the payment request for the $200 program.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4">
                <p className="glow font-display uppercase tracking-wider text-sm text-bone/70 mb-1">
                  Request Your Custom Program
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">Name</span>
                    <input name="name" required className={inputCls + " mt-2"} />
                  </label>
                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">Email</span>
                    <input name="email" type="email" required className={inputCls + " mt-2"} />
                  </label>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">Age</span>
                    <input name="age" type="number" className={inputCls + " mt-2"} />
                  </label>
                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">Bodyweight</span>
                    <input name="bodyweight" placeholder="e.g. 185 lb" className={inputCls + " mt-2"} />
                  </label>
                  <label className="block">
                    <span className="font-display uppercase tracking-wider text-xs text-bone/70">Timeline</span>
                    <select name="timeline" className={inputCls + " mt-2"}>
                      <option>4 weeks</option>
                      <option>8 weeks</option>
                      <option>12 weeks</option>
                      <option>16+ weeks</option>
                      <option>Not sure</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">Primary goal</span>
                  <select name="goal" className={inputCls + " mt-2"}>
                    <option>Build strength (powerlifting focus)</option>
                    <option>Build muscle / hypertrophy</option>
                    <option>Fat loss + retention of strength</option>
                    <option>Athletic performance</option>
                    <option>General health &amp; fitness</option>
                    <option>Return from injury / get healthy</option>
                    <option>Other</option>
                  </select>
                </label>

                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                    Training history &amp; current lifts
                  </span>
                  <textarea
                    name="history"
                    rows={3}
                    placeholder="How long have you trained? Current squat/bench/deadlift or main lifts? Any injuries?"
                    className={inputCls + " mt-2 resize-none"}
                  />
                </label>

                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                    Equipment available
                  </span>
                  <textarea
                    name="equipment"
                    rows={2}
                    placeholder="e.g. full commercial gym, home gym with rack + barbell, dumbbells only..."
                    className={inputCls + " mt-2 resize-none"}
                  />
                </label>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-2 bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60"
                >
                  {status === "submitting" ? "Sending…" : "Submit Application"}
                </button>

                {status === "error" && (
                  <p className="text-bone text-sm">
                    Something went wrong sending your application. Try again, or email me directly.
                  </p>
                )}

                <p className="text-[11px] text-bone/40 leading-relaxed">
                  Submitting is free — no payment is taken on the site. If approved, you&apos;ll
                  receive a payment request for the $200 program.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
