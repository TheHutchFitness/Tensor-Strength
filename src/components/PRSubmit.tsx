"use client";

import { useState } from "react";
import { LEAD_CAPTURE_URL } from "../lib/public-links";

type Status = "idle" | "submitting" | "success" | "error";

export default function PRSubmit() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      lift: data.get("lift"),
      result: data.get("result"),
      note: data.get("note"),
      source: "Tensor Strength — PR Board Submission",
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
    "w-full bg-transparent border-b-2 border-bone/40 py-3 text-bone focus:border-electric outline-none";

  if (status === "success") {
    return (
      <div className="border-2 border-electric bg-ink/30 backdrop-blur-sm p-8 text-center">
        <p className="glow font-display uppercase text-xl text-electric">PR submitted.</p>
        <p className="mt-3 text-bone/80 text-sm leading-relaxed">
          Nice work. Hutch will review it and add it to the public PR Board on the next
          publish.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="block">
          <span className="font-display uppercase tracking-wider text-xs text-bone/70">Your name (first)</span>
          <input name="name" required className={inputCls + " mt-2"} placeholder="e.g. Nolan" />
        </label>
        <label className="block">
          <span className="font-display uppercase tracking-wider text-xs text-bone/70">Lift</span>
          <input name="lift" required className={inputCls + " mt-2"} placeholder="e.g. Bench Press" />
        </label>
      </div>

      <label className="block">
        <span className="font-display uppercase tracking-wider text-xs text-bone/70">Result</span>
        <input name="result" required className={inputCls + " mt-2"} placeholder="e.g. 225 lb × 20 reps" />
      </label>

      <label className="block">
        <span className="font-display uppercase tracking-wider text-xs text-bone/70">Note (optional)</span>
        <textarea
          name="note"
          rows={2}
          className={inputCls + " mt-2 resize-none"}
          placeholder="Context — meet, PR, milestone..."
        />
      </label>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-2 bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors disabled:opacity-60 w-fit"
      >
        {status === "submitting" ? "Submitting…" : "Submit PR"}
      </button>

      {status === "error" && (
        <p className="text-bone text-sm">
          Something went wrong submitting your PR. Try again, or message Hutch via the chat button.
        </p>
      )}
    </form>
  );
}
