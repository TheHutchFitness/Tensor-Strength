"use client";

import { useEffect, useRef, useState } from "react";

// Default clips + captions. Captions can be overridden by admins (persisted in
// the DB) and are merged over these defaults at runtime.
export const DEFAULT_CLIPS = [
  { src: "/videos/coaching1.mp4", poster: "/videos/coaching1-poster.jpg", label: "Hill Sprints" },
  { src: "/videos/coaching2.mp4", poster: "/videos/coaching2-poster.jpg", label: "Weighted Dips — 45 lb" },
  { src: "/videos/coaching3.mp4", poster: "/videos/coaching3-poster.jpg", label: "Bench Press" },
  { src: "/videos/coaching4.mp4", poster: "/videos/coaching4-poster.jpg", label: "RDLs — Slow Eccentric" },
  { src: "/videos/coaching5.mp4", poster: "/videos/coaching5-poster.jpg", label: "Chest Press — Eccentric Overload" },
  { src: "/videos/coaching6.mp4", poster: "/videos/coaching6-poster.jpg", label: "Barbell Farmer's Walk — 420 lb" },
  { src: "/videos/coaching7.mp4", poster: "/videos/coaching7-poster.jpg", label: "Sled Push" },
  { src: "/videos/coaching8.mp4", poster: "/videos/coaching8-poster.jpg", label: "2-Month Squat Progress" },
  { src: "/videos/coaching9.mp4", poster: "/videos/coaching9-poster.jpg", label: "Med-Ball Rotations" },
  { src: "/videos/coaching10.mp4", poster: "/videos/coaching10-poster.jpg", label: "Posterior Chain & Conditioning" },
  { src: "/videos/coaching11.mp4", poster: "/videos/coaching11-poster.jpg", label: "Bench Press — 20 lb PR" },
  { src: "/videos/coaching12.mp4", poster: "/videos/coaching12-poster.jpg", label: "5-Minute Plank Record" },
  { src: "/videos/coaching13.mp4", poster: "/videos/coaching13-poster.jpg", label: "Squat — 555 lb" },
  { src: "/videos/coaching14.mp4", poster: "/videos/coaching14-poster.jpg", label: "Bench — 290 lb" },
  { src: "/videos/coaching15.mp4", poster: "/videos/coaching15-poster.jpg", label: "Deadlift — 560 lb" },
  { src: "/videos/coaching16.mp4", poster: "/videos/coaching16-poster.jpg", label: "Rotational Power" },
  { src: "/videos/coaching17.mp4", poster: "/videos/coaching17-poster.jpg", label: "Deadlift — 300 lb (1×3)" },
  { src: "/videos/coaching18.mp4", poster: "/videos/coaching18-poster.jpg", label: "Weighted Step-Ups" },
  { src: "/videos/coaching19.mp4", poster: "/videos/coaching19-poster.jpg", label: "Sled Pulls — 240 lb" },
];

export default function CoachingShowcase() {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/coaching-content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.labels) setLabels(d.labels);
      })
      .catch(() => {});
  }, []);

  const labelFor = (src: string, fallback: string) => labels[src] || fallback;

  // Clips autoplay muted (silent wall). Tapping one turns its sound on and mutes
  // every other clip. Tapping the active one again mutes it back.
  const handleClick = (i: number) => {
    const vids = videoRefs.current;
    const target = vids[i];
    if (!target) return;
    if (target.muted) {
      vids.forEach((v, j) => {
        if (v && j !== i) v.muted = true;
      });
      target.muted = false;
      target.play().catch(() => {});
      setActiveIndex(i);
    } else {
      target.muted = true;
      setActiveIndex((prev) => (prev === i ? null : prev));
    }
  };

  return (
    <section id="coaching" className="py-24 md:py-32 bg-ink/40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Coaching In Action
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Real reps. <span className="text-electric">Real coaching.</span>
          </h2>
          <p className="mt-6 text-lg text-bone/80 leading-relaxed">
            No stock footage. This is what training with Tensor Strength actually looks
            like — heavy barbells, honest cues, and lifters putting in the work. Tap any
            clip to turn the sound on.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {DEFAULT_CLIPS.map((c, i) => {
            const label = labelFor(c.src, c.label);
            const isActive = activeIndex === i;
            return (
              <figure
                key={c.src}
                onClick={() => handleClick(i)}
                className="group relative aspect-[9/16] overflow-hidden border-2 border-electric/40 hover:border-electric transition-colors bg-ink cursor-pointer"
              >
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el;
                  }}
                  src={c.src}
                  poster={c.poster}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={`Tensor Strength coaching: ${label}`}
                />

                {/* Sound indicator */}
                <div className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-ink/70 backdrop-blur-sm rounded-full text-bone group-hover:text-electric transition-colors">
                  {isActive ? (
                    <span aria-hidden className="text-sm">🔊</span>
                  ) : (
                    <span aria-hidden className="text-sm opacity-70">🔇</span>
                  )}
                </div>

                <figcaption className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/90 to-transparent px-3 pt-8 pb-3">
                  <span className="font-display uppercase tracking-wider text-[11px] text-bone/90">
                    {label}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
