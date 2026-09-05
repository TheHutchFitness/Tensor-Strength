"use client";

import { useEffect, useState } from "react";
import { professionals } from "@/data/professionals";

// How many testimonials to feature per professional on the home page.
const FEATURED_TESTIMONIALS = 2;

type DbPro = {
  slug: string;
  name: string;
  title: string;
  photo: string;
  location: string;
  shortBio: string;
};

export default function Professionals() {
  const founder = professionals[0];
  const [dbPros, setDbPros] = useState<DbPro[]>([]);

  useEffect(() => {
    fetch("/api/professionals")
      .then((r) => (r.ok ? r.json() : { professionals: [] }))
      .then((d) => setDbPros(d.professionals || []))
      .catch(() => setDbPros([]));
  }, []);

  const staticSlugs = new Set(professionals.map((p) => p.slug));
  const extraPros = dbPros.filter((p) => !staticSlugs.has(p.slug));

  const cards = [
    ...professionals.map((p) => ({
      slug: p.slug,
      name: p.name,
      title: p.title,
      photo: p.photo,
      location: p.location,
      shortBio: p.shortBio,
    })),
    ...extraPros,
  ];

  return (
    <section id="professionals" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Heading */}
        <div className="max-w-2xl">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            The Professionals
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            The coaches behind
            <br />
            the <span className="text-electric">work.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            Tensor Strength is built on real coaching, not influencers. Every
            program is designed by a coach who has put in the reps — and who
            puts their name on the work.
          </p>
        </div>

        {/* Professional cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {cards.map((p) => (
            <a
              key={p.slug}
              href={`/professionals/${p.slug}`}
              className="group border-2 border-bone/15 hover:border-electric transition-colors bg-ink/30 backdrop-blur-sm overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-ink">
                {p.photo ? (
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-display text-electric text-6xl">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink to-transparent p-5">
                  <p className="font-display uppercase text-2xl text-bone font-700 leading-tight">
                    {p.name}
                  </p>
                  <p className="font-display uppercase tracking-wider text-sm text-electric mt-1">
                    {p.title}
                  </p>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                {p.location && (
                  <p className="text-sm text-bone/60 uppercase tracking-wider">{p.location}</p>
                )}
                <p className="mt-3 text-bone/80 leading-relaxed text-sm flex-1">{p.shortBio}</p>
                <p className="mt-5 font-display uppercase tracking-wider text-sm text-electric group-hover:text-bone transition-colors">
                  View profile &amp; testimonials →
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* Featured testimonials from the founder */}
        {founder && founder.testimonials.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-4 mb-6">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm">
                What {founder.name}&apos;s clients say
              </p>
              <span className="h-px flex-1 bg-bone/15" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {founder.testimonials.slice(0, FEATURED_TESTIMONIALS).map((r) => (
                <figure
                  key={r.name}
                  className="border border-bone/15 bg-navy-deep/40 backdrop-blur-sm p-8 flex flex-col"
                >
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
            <p className="mt-8 font-display uppercase tracking-wider text-bone/50 text-sm">
              See more results on{" "}
              <a
                href={`/professionals/${founder.slug}`}
                className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors"
              >
                {founder.name}&apos;s profile
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
