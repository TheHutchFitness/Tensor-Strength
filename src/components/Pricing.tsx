import CheckoutButton from "./CheckoutButton";

type Tier = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  featured?: boolean;
  packageId?: string;
  cta: { label: string; href?: string };
};

type CoachOffer = {
  name: string;
  price: string;
  cadence: string;
  packageId?: string;
  href?: string;
  cta: string;
};

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "always",
    tagline: "Limited, but real.",
    features: [
      "3 starter programs (beginner, home, conditioning)",
      "Program Finder",
      "Training guides",
      "A free account you can actually use",
    ],
    cta: { label: "Start free", href: "/login?signup=1" },
  },
  {
    name: "Membership",
    price: "$9.99 CAD",
    cadence: "/ month",
    tagline: "The training system. This is the default.",
    featured: true,
    features: [
      "Full Client Portal — log, calculators, libraries",
      "The Hutch Touch + weekly programs",
      "Exercise & warmup libraries, PR tracker",
      "Community forum — real usage, real data",
    ],
    packageId: "monthly_9_99",
    cta: { label: "Join — $9.99 CAD/mo" },
  },
  {
    name: "Tensor AI Beta",
    price: "$12.99 CAD",
    cadence: "/ month",
    tagline: "Founding price. Not billed yet.",
    features: [
      "Same assistant in text and voice",
      "DeepSeek for everyday work, Terra when you need it",
      "Projects, memory, and Builder — coming on the member site",
      "Founding rate while Tensor AI is in beta",
    ],
    cta: { label: "Start free — AI opens next", href: "/login?signup=1" },
  },
];

const coaching: CoachOffer[] = [
  {
    name: "Custom program",
    price: "$200 CAD",
    cadence: "one-time",
    packageId: "custom_program_200",
    cta: "Checkout",
  },
  {
    name: "Remote coaching",
    price: "$400 CAD",
    cadence: "/ month",
    packageId: "remote_coaching_400",
    cta: "Checkout",
  },
  {
    name: "In-person",
    price: "1:1",
    cadence: "The Fit Effect",
    href: "/apply",
    cta: "Apply",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-12">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Membership
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Start with
            <br />
            <span className="text-electric">$9.99/mo.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            The monthly membership is the product we want people in. Free is real.
            Tensor AI is a founding beta. Coaching stays available at checkout —
            it is just not the headline.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map((t) => {
            const btnCls =
              "mt-6 px-5 py-3 font-display uppercase tracking-wider text-sm text-center transition-colors block w-full " +
              (t.featured
                ? "bg-electric text-ink hover:bg-bone"
                : "border-2 border-bone hover:bg-bone hover:text-ink");
            return (
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
                    Start here
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
                      <span className="text-electric shrink-0">→</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {t.packageId ? (
                  <CheckoutButton packageId={t.packageId} className={btnCls}>
                    {t.cta.label}
                  </CheckoutButton>
                ) : (
                  <a href={t.cta.href} className={btnCls}>
                    {t.cta.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div id="coaching" className="mt-10 scroll-mt-24">
          <p className="font-display uppercase tracking-[0.2em] text-[11px] text-bone/40 mb-3">
            Coaching — checkout, not the campaign
          </p>
          <div className="grid md:grid-cols-3 gap-2">
            {coaching.map((c) => {
              const btn =
                "px-3 py-2 font-display uppercase tracking-wider text-[11px] border border-bone/30 hover:border-electric hover:text-electric transition-colors";
              return (
                <div
                  key={c.name}
                  className="flex items-center justify-between gap-3 border border-bone/10 bg-ink/20 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-display uppercase tracking-wider text-xs text-bone/80">{c.name}</p>
                    <p className="text-[11px] text-bone/45 mt-0.5">
                      {c.price} <span className="text-bone/30">{c.cadence}</span>
                    </p>
                  </div>
                  {c.packageId ? (
                    <CheckoutButton packageId={c.packageId} className={btn}>
                      {c.cta}
                    </CheckoutButton>
                  ) : (
                    <a href={c.href} className={btn}>
                      {c.cta}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-xs text-bone/40 leading-relaxed max-w-xl">
          First-responder, military, and student rates exist. Ask at checkout — they
          are not a marketing pitch.
        </p>
      </div>
    </section>
  );
}
