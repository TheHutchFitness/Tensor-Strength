"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { professionals, type Professional } from "@/data/professionals";
import SiteTabBar from "@/components/SiteTabBar";

type DbPro = {
  slug: string;
  name: string;
  title: string;
  photo: string;
  location: string;
  shortBio: string;
};

// A coach the page can render. Static coaches carry full data (bio +
// testimonials); DB coaches carry the lighter public shape (no testimonials).
type Coach = {
  slug: string;
  name: string;
  title: string;
  photo: string;
  location: string;
  shortBio: string;
  testimonials: Professional["testimonials"];
};

function Testimonial({ r }: { r: Professional["testimonials"][number] }) {
  return (
    <figure className="border border-bone/15 bg-navy-deep/40 backdrop-blur-sm p-6 flex flex-col">
      <div className="text-electric font-display text-4xl leading-none mb-3">&ldquo;</div>
      <blockquote className="text-bone/90 leading-relaxed text-sm flex-1">{r.quote}</blockquote>
      <figcaption className="mt-5 border-t border-bone/15 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display uppercase tracking-wider text-sm">{r.name}</p>
            <p className="text-xs text-electric mt-1">{r.detail}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-xl text-electric font-700 leading-none">{r.highlight}</p>
            <p className="text-[10px] uppercase tracking-wider text-bone/60 mt-1">{r.highlightLabel}</p>
          </div>
        </div>
      </figcaption>
    </figure>
  );
}

export default function MeetTheTeamPage() {
  const [dbPros, setDbPros] = useState<DbPro[]>([]);

  useEffect(() => {
    fetch("/api/professionals")
      .then((r) => (r.ok ? r.json() : { professionals: [] }))
      .then((d) => setDbPros(d.professionals || []))
      .catch(() => setDbPros([]));
  }, []);

  const staticSlugs = new Set(professionals.map((p) => p.slug));

  const coaches: Coach[] = [
    ...professionals.map((p) => ({
      slug: p.slug,
      name: p.name,
      title: p.title,
      photo: p.photo,
      location: p.location,
      shortBio: p.shortBio,
      testimonials: p.testimonials,
    })),
    ...dbPros
      .filter((p) => !staticSlugs.has(p.slug))
      .map((p) => ({ ...p, testimonials: [] as Professional["testimonials"] })),
  ];

  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-6">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
              Meet the Team
            </p>
            <h1 className="glow font-display uppercase text-4xl md:text-6xl font-700 leading-tight">
              The coaches behind
              <br />
              the <span className="text-electric">work.</span>
            </h1>
            <p className="mt-6 text-bone/80 max-w-2xl leading-relaxed">
              Tensor Strength is built on real coaching, not influencers. Every
              program is designed by a coach who has put in the reps — and who
              puts their name on the work.
            </p>

            <div className="mt-16 space-y-16">
              {coaches.map((c) => (
                <article
                  key={c.slug}
                  className="border-2 border-bone/15 bg-ink/30 backdrop-blur-sm p-6 md:p-8"
                >
                  {/* Profile header */}
                  <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-start">
                    <div className="relative aspect-[4/3] overflow-hidden bg-ink border border-bone/10">
                      {c.photo ? (
                        <img
                          src={c.photo}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-display text-electric text-6xl">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2 flex flex-col">
                      <h2 className="font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                        {c.name}
                      </h2>
                      <p className="font-display uppercase tracking-wider text-sm text-electric mt-2">
                        {c.title}
                      </p>
                      {c.location && (
                        <p className="text-sm text-bone/60 uppercase tracking-wider mt-2">
                          {c.location}
                        </p>
                      )}
                      <p className="mt-4 text-bone/80 leading-relaxed">{c.shortBio}</p>
                      <a
                        href={`/professionals/${c.slug}`}
                        className="mt-5 inline-flex w-fit font-display uppercase tracking-wider text-sm text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors"
                      >
                        View full profile →
                      </a>
                    </div>
                  </div>

                  {/* Testimonials under this coach */}
                  {c.testimonials.length > 0 && (
                    <div className="mt-8 border-t border-bone/10 pt-8">
                      <div className="flex items-center gap-4 mb-6">
                        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm">
                          What {c.name}&apos;s clients say
                        </p>
                        <span className="h-px flex-1 bg-bone/15" />
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        {c.testimonials.map((r) => (
                          <Testimonial key={r.name} r={r} />
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
