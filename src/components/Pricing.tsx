const tiers = [
  {
    name: "Free Tools",
    price: "$0",
    cadence: "always",
    tagline: "Start here.",
    features: [
      "3 free starter programs (beginner, home, conditioning)",
      "Program Finder — get your training framework",
      "Training guides (accessory work, consistency, overload)",
      "Weekly programs teaser",
    ],
    cta: { label: "Try the free tools", href: "/#programs" },
    featured: false,
  },
  {
    name: "Custom Program",
    price: "$200",
    cadence: "one-time",
    tagline: "The most popular step up.",
    features: [
      "A program built around your lifts, gear, and goals",
      "Strength + accessory work programmed to your weak points",
      "Progressive overload + deload built in",
      "Direct follow-up so you start aligned",
    ],
    cta: { label: "Get a Custom Program", href: "/#program" },
    featured: true,
  },
  {
    name: "Remote Coaching",
    price: "$400",
    cadence: "/ month",
    tagline: "Ongoing coaching, anywhere.",
    features: [
      "Custom programming that adapts as you progress",
      "Weekly check-ins and program adjustments",
      "Full Client Portal — workout log, calculators, libraries",
      "1:1 chat access to Hutch",
    ],
    cta: { label: "Apply for Coaching", href: "/#contact" },
    featured: false,
  },
  {
    name: "In-Person Training",
    price: "At The Fit Effect",
    cadence: "Paris, ON",
    tagline: "Hands-on, in the gym.",
    features: [
      "1:1 coaching at The Fit Effect in Paris, Ontario",
      "Technique work, hands-on correction",
      "Programming built around your in-gym sessions",
      "Exclusive — in-person only",
    ],
    cta: { label: "Apply for In-Person", href: "/#contact" },
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-12">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Training Options
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Pick your
            <br />
            <span className="text-electric">level.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            Free tools to start, a one-off custom program when you&apos;re ready, ongoing
            remote coaching to actually get there, or in-person at The Fit Effect. No
            wrong door — just the one that fits where you are.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={
                "border p-6 flex flex-col transition-colors " +
                (t.featured
                  ? "border-electric bg-electric/10"
                  : "border-bone/15 bg-ink/30 backdrop-blur-sm hover:border-bone/30")
              }
            >
              <p className="font-display uppercase tracking-wider text-bone">{t.name}</p>
              {t.featured && (
                <p className="font-display uppercase tracking-wider text-[10px] text-ink bg-electric inline-block w-fit px-2 py-0.5 mt-2">
                  Most popular
                </p>
              )}
              <p className="mt-4 font-display text-3xl text-electric font-700 leading-none">
                {t.price}
              </p>
              <p className="text-xs text-bone/50 mt-1">{t.cadence}</p>
              <p className="text-sm text-bone/70 mt-3 leading-relaxed">{t.tagline}</p>

              <ul className="mt-5 grid gap-2 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-bone/70 leading-relaxed">
                    <span className="text-electric shrink-0">⚡</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={t.cta.href}
                className={
                  "mt-6 px-5 py-3 font-display uppercase tracking-wider text-sm text-center transition-colors " +
                  (t.featured
                    ? "bg-electric text-ink hover:bg-bone"
                    : "border-2 border-bone hover:bg-bone hover:text-ink")
                }
              >
                {t.cta.label} →
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-bone/40 leading-relaxed max-w-xl">
          Not sure which fits? Run the{" "}
          <a href="/#program-finder" className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors">
            Program Finder
          </a>{" "}
          first — it&apos;ll point you at the right starting place.
        </p>
      </div>
    </section>
  );
}
