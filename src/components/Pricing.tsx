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
    tagline: "The training system.",
    featured: true,
    features: [
      "Full Client Portal — log, calculators, libraries",
      "The Hutch Touch + weekly programs",
      "Exercise & warmup libraries, PR tracker",
      "Community forum",
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
            Simple
            <br />
            <span className="text-electric">pricing.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            Start free. Upgrade to the member system when you want the full portal.
            Tensor AI is a founding beta — $12.99/month when it opens. Coaching is
            separate: apply, don&apos;t pick a card.
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
                    Core
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

        <div className="mt-8 border border-bone/15 bg-ink/30 p-6 md:flex md:items-center md:justify-between gap-6">
          <div>
            <p className="font-display uppercase tracking-wider text-sm text-bone">Want a coach?</p>
            <p className="mt-2 text-sm text-bone/65 leading-relaxed max-w-xl">
              Custom programs, remote coaching, and in-person work at The Fit Effect
              are by application — not another price tile.
            </p>
          </div>
          <a
            href="/apply"
            className="mt-4 md:mt-0 inline-block border-2 border-bone px-5 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone hover:text-ink transition-colors shrink-0"
          >
            Apply / contact
          </a>
        </div>

        <p className="mt-6 text-xs text-bone/40 leading-relaxed max-w-xl">
          First-responder, military, and student rates exist. Ask at checkout or when
          you apply — they are not a marketing pitch.
        </p>
      </div>
    </section>
  );
}
