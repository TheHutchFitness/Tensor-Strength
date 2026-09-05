"use client";

import { useEffect, useState } from "react";

type Step = { title: string; body: string };

export default function Tour({ id, steps }: { id: string; steps: Step[] }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(`ts-tour-${id}`)) {
        setOpen(true);
        // Mark this area's tour as seen as soon as it appears, so it only ever
        // pops up on the first visit — even if the user navigates away.
        localStorage.setItem(`ts-tour-${id}`, "1");
      }
    } catch {}
  }, [id]);

  function done() {
    try { localStorage.setItem(`ts-tour-${id}`, "1"); } catch {}
    setOpen(false);
  }

  if (!open || steps.length === 0) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 backdrop-blur-sm px-6">
      <div className="w-full max-w-md border-2 border-electric bg-ink p-8 text-bone">
        <div className="flex items-center gap-1.5 mb-5">
          {steps.map((_, idx) => (
            <span key={idx} className={"h-1.5 flex-1 " + (idx <= i ? "bg-electric" : "bg-bone/20")} />
          ))}
        </div>
        <p className="glow font-display uppercase text-2xl font-700 leading-tight text-electric">{step.title}</p>
        <p className="mt-3 text-bone/80 leading-relaxed">{step.body}</p>
        <div className="mt-7 flex items-center justify-between">
          <button onClick={done} className="font-display uppercase tracking-wider text-xs text-bone/50 hover:text-bone">
            Skip
          </button>
          <button
            onClick={() => (last ? done() : setI(i + 1))}
            className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors"
          >
            {last ? "Let's go →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
