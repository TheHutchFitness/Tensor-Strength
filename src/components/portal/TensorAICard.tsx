"use client";

import { useEffect, useState } from "react";

type Access = {
  signedIn?: boolean;
  entitled?: boolean;
};

export default function TensorAICard() {
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    fetch("/api/ai/access", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setAccess(data))
      .catch(() => setAccess(null));
  }, []);

  if (!access?.signedIn) return null;

  if (access.entitled) {
    return (
      <section className="mb-8 border-2 border-electric/50 bg-electric/5 p-6">
        <p className="font-display uppercase tracking-[0.22em] text-electric text-xs">
          Tensor AI
        </p>
        <h2 className="mt-2 font-display uppercase text-2xl text-bone">
          Gym, sport, and athletics
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bone/70">
          Tensor AI stays in the weight room and on the field: lifting, conditioning,
          sport performance, recovery, and how to use your program. Coach-programmed
          work and your logged data stay clearly separated from suggestions.
        </p>
        <a
          href="/ai"
          className="mt-5 inline-block bg-electric text-ink px-5 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors"
        >
          Open Tensor AI →
        </a>
      </section>
    );
  }

  return (
    <section className="mb-8 border border-bone/15 bg-ink/30 p-6">
      <p className="font-display uppercase tracking-[0.22em] text-electric text-xs">
        Tensor AI Beta
      </p>
      <h2 className="mt-2 font-display uppercase text-xl text-bone">
        Gym, sport, and athletics specialist
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bone/65">
        Core membership stays at $9.99 CAD/month. Tensor AI Beta is a separate
        $12.99 CAD/month founding coach for gym, fitness, sports, and athletics.
      </p>
      <a
        href="/checkout?plan=tensor_ai_beta_12_99"
        className="mt-5 inline-block border-2 border-electric text-electric px-5 py-3 font-display uppercase tracking-wider text-sm hover:bg-electric hover:text-ink transition-colors"
      >
        See Tensor AI Beta →
      </a>
    </section>
  );
}
