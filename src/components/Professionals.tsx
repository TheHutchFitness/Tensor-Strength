import { professionals } from "../data/professionals";

// Home page: a streamlined founder spotlight. The full coach roster now lives
// on the dedicated /meet-the-team page. Here we feature the founder (Hutch)
// with a compact card on the left and his client testimonials on the right.
export default function Professionals() {
  const founder = professionals[0];
  if (!founder) return null;

  const testimonials = founder.testimonials.slice(0, 4);

  return (
    <section id="professionals" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Heading */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 max-w-none">
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
          <a
            href="/meet-the-team"
            className="shrink-0 border-2 border-electric text-electric px-6 py-3 font-display uppercase tracking-wider text-sm hover:bg-electric hover:text-ink transition-colors whitespace-nowrap"
          >
            Meet the team →
          </a>
        </div>

        {/* Founder spotlight: compact card (left) + testimonials (right) */}
        <div className="mt-14 grid gap-8 lg:grid-cols-12 items-start">
          {/* Compact founder card */}
          <a
            href={`/professionals/${founder.slug}`}
            className="lg:col-span-4 group border-2 border-bone/15 hover:border-electric transition-colors bg-ink/30 backdrop-blur-sm overflow-hidden flex flex-col"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-ink">
              {founder.photo ? (
                <img
                  src={founder.photo}
                  alt={founder.name}
                  className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center font-display text-electric text-6xl">
                  {founder.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink to-transparent p-4">
                <p className="font-display uppercase text-xl text-bone font-700 leading-tight">
                  {founder.name}
                </p>
                <p className="font-display uppercase tracking-wider text-xs text-electric mt-1 leading-snug">
                  {founder.title}
                </p>
              </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
              {founder.location && (
                <p className="text-xs text-bone/60 uppercase tracking-wider">
                  {founder.location}
                </p>
              )}
              <p className="mt-3 text-bone/80 leading-relaxed text-sm flex-1">
                {founder.shortBio}
              </p>
              <p className="mt-5 font-display uppercase tracking-wider text-xs text-electric group-hover:text-bone transition-colors">
                View profile &amp; testimonials →
              </p>
            </div>
          </a>

          {/* Testimonials */}
          <div className="lg:col-span-8">
            <div className="flex items-center gap-4 mb-6">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm">
                What {founder.name}&apos;s clients say
              </p>
              <span className="h-px flex-1 bg-bone/15" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {testimonials.map((r) => (
                <figure
                  key={r.name}
                  className="border border-bone/15 bg-navy-deep/40 backdrop-blur-sm p-6 flex flex-col"
                >
                  <div className="text-electric font-display text-4xl leading-none mb-3">
                    &ldquo;
                  </div>
                  <blockquote className="text-bone/90 leading-relaxed text-sm flex-1">
                    {r.quote}
                  </blockquote>
                  <figcaption className="mt-5 border-t border-bone/15 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display uppercase tracking-wider text-sm">
                          {r.name}
                        </p>
                        <p className="text-xs text-electric mt-1">{r.detail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-xl text-electric font-700 leading-none">
                          {r.highlight}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-bone/60 mt-1">
                          {r.highlightLabel}
                        </p>
                      </div>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
