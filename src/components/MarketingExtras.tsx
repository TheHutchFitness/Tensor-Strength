"use client";

import { useEffect, useRef, useState } from "react";

/* Animated count-up stat band */
function Stat({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !done.current) {
        done.current = true;
        const start = performance.now();
        const dur = 1400;
        const from = end;
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          setN(Math.round(from * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Live values may arrive after the count-up has already run — snap to the
  // latest real number so the display always reflects the true count.
  useEffect(() => {
    if (done.current) setN(end);
  }, [end]);
  return (
    <div ref={ref} className="text-center">
      <p className="glow font-display text-4xl md:text-5xl text-electric font-700">{n.toLocaleString()}{suffix}</p>
      <p className="text-bone/60 text-xs uppercase tracking-wider mt-2">{label}</p>
    </div>
  );
}

const FAQS = [
  { q: "Do I need a gym membership?", a: "No — every program can be adapted to a commercial gym, a garage setup, or minimal equipment. Tell your coach what you have and we build around it." },
  { q: "How is coaching delivered?", a: "Everything lives in your Client Portal: your workout tracker, nutrition targets, weekly check-ins, file sharing and direct messaging with your coach." },
  { q: "I'm a beginner — is this for me?", a: "Absolutely. Programs scale from first-time lifter to advanced competitor, and the Exercise Library walks you through every movement." },
  { q: "Can I cancel anytime?", a: "Yes. Coaching is month-to-month with no long lock-ins — stay because it's working, not because you're stuck." },
  { q: "What if I have an injury or limitation?", a: "Your coach logs it in your private notes and programs around it. Nothing we prescribe should aggravate a niggle." },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-3xl mx-auto">
      <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-3 text-center">FAQ</p>
      <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 text-center mb-10">
        Questions, <span className="text-electric">answered.</span>
      </h2>
      <div className="grid gap-3">
        {FAQS.map((f, i) => (
          <div key={i} className="border border-bone/15 bg-ink/20">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-display uppercase tracking-wider text-bone text-sm">{f.q}</span>
              <span className={"text-electric font-display text-xl transition-transform " + (open === i ? "rotate-45" : "")}>+</span>
            </button>
            {open === i && <p className="px-5 pb-5 -mt-1 text-bone/70 leading-relaxed text-sm">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketingExtras() {
  const [stats, setStats] = useState<{ athletesCoached: number; totalAccounts: number; workoutsLogged: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStats(d);
      })
      .catch(() => {});
  }, []);

  const athletes = stats?.athletesCoached ?? 15;
  const members = stats?.totalAccounts ?? 0;
  const workouts = stats?.workoutsLogged ?? 0;

  return (
    <section className="py-20 md:py-28 border-t border-bone/10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-24">
          <Stat end={12} suffix="" label="Years experience" />
          <Stat end={athletes} suffix="" label="Athletes coached" />
          <Stat end={members} suffix="" label="Members" />
          <Stat end={workouts} suffix="" label="Workouts logged" />
          <Stat end={100} suffix="%" label="Would recommend" />
        </div>
        <Faq />
      </div>
    </section>
  );
}
