"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { professionals, type Professional } from "@/data/professionals";

export default function ProfessionalPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const [p, setP] = useState<Professional | null>(null);
  const [state, setState] = useState<"loading" | "found" | "notfound">("loading");
  const [videoOverride, setVideoOverride] = useState<(Professional["videoTestimonial"] & { hidden?: boolean }) | { hidden?: boolean } | null>(null);

  useEffect(() => {
    // Admin-set video testimonials (per coach slug) override the static data.
    fetch("/api/coach-content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = d?.coaches?.[slug];
        // Persist ANY admin override (including an explicit { hidden:true } removal)
        // so the render logic can hide the video instead of reverting to default.
        if (v) setVideoOverride(v);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    const staticPro = professionals.find((x) => x.slug === slug);
    if (staticPro) {
      setP(staticPro);
      setState("found");
      return;
    }
    fetch(`/api/professionals/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.professional) {
          setP(d.professional as Professional);
          setState("found");
        } else {
          setState("notfound");
        }
      })
      .catch(() => setState("notfound"));
  }, [slug]);

  if (state === "loading") {
    return (
      <>
        <Navbar />
        <main className="text-bone min-h-screen flex items-center justify-center">
          <p className="font-display uppercase tracking-wider text-bone/50">Loading…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (state === "notfound" || !p) {
    return (
      <>
        <Navbar />
        <main className="text-bone min-h-screen flex flex-col items-center justify-center gap-4 px-6">
          <h1 className="font-display uppercase text-3xl text-bone">Coach not found</h1>
          <a href="/#professionals" className="text-electric border-b border-electric hover:text-bone">
            ← Back to all coaches
          </a>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Profile header */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-6 grid md:grid-cols-[1fr_1.3fr] gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hidden sm:block w-fit">
                {p.title}
              </div>
              <div className="relative mt-0 sm:mt-4 aspect-[4/5] border-4 border-electric overflow-hidden bg-ink">
                {p.photo ? (
                  <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-display text-electric text-8xl">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="order-1 md:order-2">
              {p.location && (
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">
                  {p.location}
                </p>
              )}
              <h1 className="glow font-display uppercase text-5xl md:text-6xl font-700 leading-[0.95]">
                {p.name}
              </h1>
              <p className="mt-4 font-display uppercase tracking-wider text-bone/70 text-lg">{p.title}</p>
              <div className="mt-8 space-y-5 text-lg text-bone/80 leading-relaxed">
                {p.bio.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Credentials + specialties */}
        <section className="py-16 md:py-20 border-t border-bone/10">
          <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-12">
            <div>
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Credentials
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight mb-8">
                The <span className="text-electric">resume.</span>
              </h2>
              {p.credentials.length === 0 ? (
                <p className="text-bone/50 text-sm">No credentials listed.</p>
              ) : (
                <ul className="grid gap-3">
                  {p.credentials.map((c) => (
                    <li key={c} className="flex items-start gap-3">
                      <span className="text-electric font-display mt-0.5">⚡</span>
                      <span className="text-bone/85 leading-relaxed">{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Specialties
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight mb-8">
                What they <span className="text-electric">coach.</span>
              </h2>
              <div className="flex flex-wrap gap-3">
                {p.specialties.map((s) => (
                  <span
                    key={s}
                    className="border-2 border-bone/20 hover:border-electric transition-colors px-4 py-2 font-display uppercase tracking-wider text-sm text-bone/85"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-10">
                <a
                  href="/#contact"
                  className="inline-block bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
                >
                  Train with {p.name} →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Video testimonial */}
        {(() => {
          // Admin override wins: an explicit { hidden:true } removes the video;
          // an override with a src replaces it; otherwise use the static default.
          const vt = (videoOverride
            ? ((videoOverride as { hidden?: boolean }).hidden ? null : videoOverride)
            : p.videoTestimonial) as Professional["videoTestimonial"] | null;
          if (!vt) return null;
          return (
          <section className="py-20 md:py-28 border-t border-bone/10">
            <div className="mx-auto max-w-6xl px-6">
              <div className="max-w-2xl mb-12 mx-auto text-center">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                  In Their Words
                </p>
                <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
                  Hear it <span className="text-electric">first-hand.</span>
                </h2>
              </div>
              <div className="flex flex-col items-center">
                <figure className="relative w-full max-w-[340px] aspect-[9/16] overflow-hidden border-4 border-electric bg-ink shadow-[0_0_40px_rgba(0,168,255,0.25)]">
                  <video
                    src={vt.src}
                    poster={vt.poster}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={`Video testimonial for ${p.name}`}
                  />
                </figure>
                {(vt.name || vt.detail) && (
                  <div className="mt-5 text-center">
                    {vt.name && (
                      <p className="font-display uppercase tracking-wider text-bone">
                        {vt.name}
                      </p>
                    )}
                    {vt.detail && (
                      <p className="text-sm text-electric mt-1">{vt.detail}</p>
                    )}
                  </div>
                )}
                <p className="mt-3 text-xs text-bone/50">Tap to play with sound.</p>
              </div>
            </div>
          </section>
          );
        })()}

        {/* Full testimonials */}
        {p.testimonials.length > 0 && (
          <section className="py-20 md:py-28 relative overflow-hidden border-t border-bone/10">
            <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
            <div className="relative mx-auto max-w-6xl px-6">
              <div className="max-w-2xl mb-14">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">The Proof</p>
                <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
                  Results don&apos;t lie.
                  <br />
                  <span className="text-electric">Neither do we.</span>
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {p.testimonials.map((r) => (
                  <figure key={r.name} className="border border-bone/15 bg-navy-deep/40 backdrop-blur-sm p-8 flex flex-col">
                    <div className="text-electric font-display text-5xl leading-none mb-4">&ldquo;</div>
                    <blockquote className="text-bone/90 leading-relaxed flex-1">{r.quote}</blockquote>
                    <figcaption className="mt-6 border-t border-bone/15 pt-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display uppercase tracking-wider">{r.name}</p>
                          <p className="text-sm text-electric mt-1">{r.detail}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-2xl text-electric font-700 leading-none">{r.highlight}</p>
                          <p className="text-[10px] uppercase tracking-wider text-bone/60 mt-1">{r.highlightLabel}</p>
                        </div>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
