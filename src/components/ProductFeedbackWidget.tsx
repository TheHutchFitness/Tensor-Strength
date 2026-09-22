"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser } from "../lib/currentUser";

type Category = "bug" | "idea" | "confusing" | "praise";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "bug", label: "Report a bug" },
  { id: "idea", label: "Suggest an idea" },
  { id: "confusing", label: "Something is confusing" },
  { id: "praise", label: "What I like" },
];

export default function ProductFeedbackWidget() {
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("idea");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => setAuthed(!!user))
      .catch(() => setAuthed(false));
  }, []);

  if (!authed) return null;

  async function submit() {
    const text = message.trim();
    if (!text || state === "sending") return;

    setState("sending");
    try {
      const res = await fetch("/api/product-feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: text,
          page: window.location.pathname + window.location.search,
        }),
      });

      if (!res.ok) throw new Error();
      setMessage("");
      setState("sent");
      setTimeout(() => {
        setState("idle");
        setOpen(false);
      }, 1200);
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 rounded-full border border-electric/50 bg-ink/90 px-4 py-2 font-display uppercase tracking-wider text-[11px] text-electric shadow-lg backdrop-blur hover:border-electric md:bottom-5"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-3 sm:place-items-center">
          <div className="w-full max-w-md border border-bone/15 bg-ink p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display uppercase tracking-[0.22em] text-xs text-electric">
                  Help build Tensor Strength
                </p>
                <h2 className="mt-1 font-display uppercase text-xl text-bone">
                  Send feedback
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-bone/50 hover:text-bone"
                aria-label="Close feedback"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {CATEGORIES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  className={
                    "border px-3 py-2 text-left text-xs transition-colors " +
                    (category === item.id
                      ? "border-electric bg-electric/10 text-electric"
                      : "border-bone/15 text-bone/65 hover:border-bone/30")
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="What happened, or what would make this better?"
              className="mt-4 w-full resize-none border border-bone/15 bg-ink/60 px-3 py-3 text-sm text-bone outline-none placeholder:text-bone/35 focus:border-electric"
            />

            {state === "error" && (
              <p className="mt-2 text-xs text-red-400">
                Couldn&apos;t send that. Please try again.
              </p>
            )}
            {state === "sent" && (
              <p className="mt-2 text-xs text-electric">Thanks — feedback received.</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={!message.trim() || state === "sending"}
              className="mt-4 w-full bg-electric px-5 py-3 font-display uppercase tracking-wider text-sm text-ink disabled:opacity-40"
            >
              {state === "sending" ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
