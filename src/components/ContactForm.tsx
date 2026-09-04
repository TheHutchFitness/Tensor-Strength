"use client";

import { useState } from "react";
import { professionals } from "@/data/professionals";

type Status = "idle" | "submitting" | "success" | "error";

// What the applicant is applying for. Drives which fields render below.
type Interest = "remote" | "inperson" | "program";

// `detail` may be a function that receives the currently-selected trainer's
// name, so the Remote Coaching card can say "Train with <name> anywhere…".
const options: {
  id: Interest;
  label: string;
  price: string;
  detail: string | ((trainerName: string) => string);
}[] = [
  {
    id: "remote",
    label: "Remote Coaching",
    price: "$400 / month",
    detail: (trainerName) =>
      `Train with ${trainerName} anywhere — remote coaching, wherever you train`,
  },
  {
    id: "inperson",
    label: "In-Person Training",
    price: "Paris, ON",
    detail: "At The Fit Effect — exclusive in-person coaching",
  },
  {
    id: "program",
    label: "Custom Program",
    price: "$200 one-time",
    detail: "A 12-week program built by hand around your goals & gear",
  },
];

const programIncluded = [
  "Custom-built training program tailored to your goals, schedule, and equipment",
  "Strength + accessory work programmed around your lifts and weak points",
  "Progressive overload scheme and deload built in",
  "Exercise selection matched to your gear (home gym, commercial, powerlifting focus, etc.)",
  "Direct follow-up so we're aligned on the plan before you start",
];

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [interest, setInterest] = useState<Interest>("remote");
  const [trainerSlug, setTrainerSlug] = useState<string>(professionals[0]?.slug ?? "");

  const trainer = professionals.find((p) => p.slug === trainerSlug) ?? professionals[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);

    const selected = options.find((o) => o.id === interest);
    const sourceTag =
      interest === "program"
        ? `Tensor Strength — Custom Program Request ($200)`
        : "Tensor Strength — Apply";

    const payload: Record<string, unknown> = {
      name: data.get("name"),
      email: data.get("email"),
      interest: selected?.label,
      trainer: trainer?.name,
      source: sourceTag,
    };

    // Fields shared by coaching applications
    if (interest === "remote" || interest === "inperson") {
      payload.goal = data.get("goal");
      payload.message = data.get("message");
    }

    // Custom program — richer intake
    if (interest === "program") {
      payload.age = data.get("age");
      payload.bodyweight = data.get("bodyweight");
      payload.timeline = data.get("timeline");
      payload.goal = data.get("programGoal");
      payload.history = data.get("history");
      payload.equipment = data.get("equipment");
    }

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

        {status === "success" ? (
          <div className="mt-12 border-2 border-electric bg-ink/30 backdrop-blur-sm p-10 text-center">
            <p className="glow font-display uppercase text-2xl">Application received.</p>
            <p className="mt-3 text-bone/80">
              Check your inbox — I&apos;ll be in touch within 48 hours with next steps.
              {interest === "program" && " That includes the payment request for the $200 program."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-12 grid gap-5">
            {/* Interest selector */}
            <fieldset>
              <legend className="font-display uppercase tracking-wider text-xs text-bone/70 mb-3">
                What are you applying for?
              </legend>
              <div className="grid sm:grid-cols-3 gap-3">
                {options.map((o) => (
                  <label key={o.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="interest"
                      value={o.id}
                      checked={interest === o.id}
                      onChange={() => setInterest(o.id)}
                      className="peer sr-only"
                    />
                    <span className="block border-2 border-bone/40 peer-checked:border-electric peer-checked:bg-electric/10 px-4 py-3 transition-colors h-full">
                      <span className="font-display uppercase tracking-wider text-sm text-bone block">
                        {o.label}
                      </span>
                      <span className="font-display text-electric text-sm mt-1 block">
                        {o.price}
                      </span>
                      <span className="block text-xs text-bone/60 mt-1 leading-snug">
                        {typeof o.detail === "function"
                          ? o.detail(trainer?.name ?? "your coach")
                          : o.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Trainer selector — data-driven from src/data/professionals.ts.
                Add a professional there and they automatically appear here. */}
            <fieldset>
              <legend className="font-display uppercase tracking-wider text-xs text-bone/70 mb-3">
                Who do you want to work with?
              </legend>
              <div className="grid sm:grid-cols-2 gap-3">
                {professionals.map((p) => (
                  <label key={p.slug} className="cursor-pointer">
                    <input
                      type="radio"
                      name="trainerSlug"
                      value={p.slug}
                      checked={trainerSlug === p.slug}
                      onChange={() => setTrainerSlug(p.slug)}
                      className="peer sr-only"
                    />
                    <span className="flex items-center gap-3 border-2 border-bone/40 peer-checked:border-electric peer-checked:bg-electric/10 px-3 py-3 transition-colors">
                      <img
                        src={p.photo}
                        alt={p.name}
                        className="h-12 w-12 object-cover shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="font-display uppercase tracking-wider text-sm text-bone block truncate">
                          {p.name}
                        </span>
                        <span className="block text-xs text-bone/60 mt-0.5 truncate">
                          {p.title}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Name + Email — always */}
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

            {/* Coaching fields */}
            {(interest === "remote" || interest === "inperson") && (
              <>
                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                    Primary goal
                  </span>
                  <select name="goal" className={selectCls + " mt-2"}>
                    {(trainer?.specialties ?? []).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                    <option>Not sure yet</option>
                  </select>
                </label>

                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                    Where are you now &amp; where do you want to be?
                  </span>
                  <textarea
                    name="message"
                    rows={4}
                    required
                    className={inputCls + " mt-2 resize-none"}
                  />
                </label>
              </>
            )}

            {/* Custom Program fields */}
            {interest === "program" && (
              <>
                <div className="border-2 border-electric/40 bg-electric/5 p-5">
                  <p className="glow font-display uppercase tracking-wider text-electric text-sm mb-3">
                    What&apos;s included
                  </p>
                  <ul className="grid gap-2">
                    {programIncluded.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-electric font-display mt-0.5">⚡</span>
                        <span className="text-bone/80 leading-relaxed text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-bone/60 leading-relaxed">
                    How it works: submit the application below. If it&apos;s a fit, I&apos;ll
                    reach out to confirm details and send a payment request for the $200.
                    Once that&apos;s taken care of, I build your program.
                  </p>
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
                    <select name="timeline" className={selectCls + " mt-2"}>
                      <option>4 weeks</option>
                      <option>8 weeks</option>
                      <option>12 weeks</option>
                      <option>16+ weeks</option>
                      <option>Not sure</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="font-display uppercase tracking-wider text-xs text-bone/70">
                    Primary goal
                  </span>
                  <select name="programGoal" className={selectCls + " mt-2"}>
                    {(trainer?.specialties ?? []).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                    <option>General health &amp; fitness</option>
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
              </>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-2 bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Submit Application"}
            </button>

            {status === "error" && (
              <p className="text-bone text-sm">
                Something went wrong sending your application. Try again, or email me
                directly.
              </p>
            )}

            <p className="text-[11px] text-bone/40 leading-relaxed">
              Submitting is free — no payment is taken on the site.{" "}
              {interest === "program"
                ? "If approved, you'll receive a payment request for the $200 program."
                : "I review every application myself and reply within 48 hours."}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
