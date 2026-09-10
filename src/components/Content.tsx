"use client";

import { packages, articles, videos } from "@/data/library";

function SubHeading({ index, kicker }: { index: string; kicker: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="font-display text-electric text-sm font-700">{index}</span>
      <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm">{kicker}</p>
      <span className="h-px flex-1 bg-bone/15" />
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="border-2 border-dashed border-bone/15 p-8 text-center">
      <p className="font-display uppercase tracking-wider text-sm text-bone/50">
        {label} are on the way — check back soon.
      </p>
    </div>
  );
}

export default function Content() {
  return (
    <section id="library" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="max-w-2xl mb-14">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            The Library
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Read, watch,
            <br />
            <span className="text-electric">then train.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            Free information packages, articles, and video breakdowns — the knowledge
            behind the coaching. New material gets added here as it drops.
          </p>
        </div>

        {/* Information Packages */}
        <div className="mb-16">
          <SubHeading index="01" kicker="Information Packages" />
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((p) => (
              <a
                key={p.title}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group border-2 border-bone/15 hover:border-electric transition-colors p-8 flex flex-col bg-ink/30 backdrop-blur-sm"
              >
                <span className="font-display uppercase tracking-wider text-xs text-electric">
                  {p.tag}
                </span>
                <h3 className="font-display uppercase text-xl font-600 leading-snug mt-4 text-bone group-hover:text-electric transition-colors">
                  {p.title}
                </h3>
                {p.description && (
                  <p className="mt-3 text-sm text-bone/60 leading-relaxed flex-1">{p.description}</p>
                )}
                <div className="mt-6 flex items-center justify-between text-sm text-bone/50">
                  <span>Read PDF</span>
                  <span className="font-display uppercase tracking-wider group-hover:text-electric transition-colors">
                    Open PDF →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Articles */}
        <div className="mb-16">
          <SubHeading index="02" kicker="Articles" />
          {articles.length === 0 ? (
            <ComingSoon label="New articles" />
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {articles.map((a) => {
                const Tag = a.href ? "a" : "div";
                return (
                  <Tag
                    key={a.title}
                    {...(a.href ? { href: a.href, target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group border-2 border-bone/15 hover:border-electric transition-colors p-8 flex flex-col bg-ink/30 backdrop-blur-sm"
                  >
                    <span className="font-display uppercase tracking-wider text-xs text-electric">{a.tag}</span>
                    <h3 className="font-display uppercase text-xl font-600 leading-snug mt-4 text-bone group-hover:text-electric transition-colors">
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="mt-3 text-sm text-bone/60 leading-relaxed flex-1">{a.excerpt}</p>
                    )}
                    {a.href && (
                      <span className="mt-6 font-display uppercase tracking-wider text-sm text-bone/50 group-hover:text-electric transition-colors">
                        Read →
                      </span>
                    )}
                  </Tag>
                );
              })}
            </div>
          )}
        </div>

        {/* Information Videos */}
        <div>
          <SubHeading index="03" kicker="Information Videos" />
          {videos.length === 0 ? (
            <ComingSoon label="Video breakdowns" />
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {videos.map((v) =>
                v.src ? (
                  <div key={v.title} className="border-2 border-bone/15 bg-ink/30 backdrop-blur-sm overflow-hidden flex flex-col">
                    <video
                      controls
                      preload="none"
                      poster={v.poster}
                      className="w-full aspect-video object-cover bg-ink"
                    >
                      <source src={v.src} />
                    </video>
                    <div className="p-6">
                      <h3 className="font-display uppercase text-lg font-600 text-bone">{v.title}</h3>
                      {v.description && <p className="mt-2 text-sm text-bone/60 leading-relaxed">{v.description}</p>}
                    </div>
                  </div>
                ) : (
                  <a
                    key={v.title}
                    href={v.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group border-2 border-bone/15 hover:border-electric transition-colors p-8 flex flex-col bg-ink/30 backdrop-blur-sm"
                  >
                    <h3 className="font-display uppercase text-lg font-600 text-bone group-hover:text-electric transition-colors">
                      {v.title}
                    </h3>
                    {v.description && <p className="mt-3 text-sm text-bone/60 leading-relaxed flex-1">{v.description}</p>}
                    <span className="mt-6 font-display uppercase tracking-wider text-sm text-bone/50 group-hover:text-electric transition-colors">
                      Watch →
                    </span>
                  </a>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
