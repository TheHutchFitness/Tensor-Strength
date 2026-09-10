"use client";

import CheckoutButton from "@/components/CheckoutButton";

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
  },
  {
    name: "Membership",
    price: "$9.99",
    cadence: "/ month",
    tagline: "Self-guided. Full portal.",
    features: [
      "Full Client Portal — workout log, calculators, libraries",
      "The Hutch Touch performance program + weekly programs",
      "Exercise & warmup libraries, PR tracker",
      "Self-directed — build and run your own training",
    ],
    packageId: "monthly_9_99",
    cta: { label: "Subscribe — $9.99/mo" },
  },
  {
    name: "Annual Membership",
    price: "$90",
    cadence: "/ year",
    tagline: "Self-guided — save ~25%.",
    features: [
      "Everything in the monthly Membership",
      "Full Client Portal — workout log, calculators, libraries",
      "The Hutch Touch performance program + weekly programs",
      "One payment a year — cheaper than monthly",
    ],
    packageId: "yearly_90",
    cta: { label: "Subscribe — $90/yr" },
  },
  {
    name: "Custom Program",
    price: "$200",
    cadence: "one-time",
    tagline: "The most popular step up.",
    featured: true,
    features: [
      "A program built around your lifts, gear, and goals",
      "Strength + accessory work programmed to your weak points",
      "Progressive overload + deload built in",
      "Includes full Client Portal access",
    ],
    packageId: "custom_program_200",
    cta: { label: "Get a Custom Program" },
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
    packageId: "remote_coaching_400",
    cta: { label: "Start Remote Coaching" },
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
      "Portal access included once you're set up",
    ],
    cta: { label: "Apply for In-Person", href: "/#contact" },
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
            Free tools to start, a self-guided membership, a one-off custom program,
            ongoing remote coaching, or in-person at The Fit Effect. Every paid option
            unlocks the Client Portal — coaching is added on top when you want a coach.
          </p>
          <div className="mt-6 inline-block border border-electric/40 bg-electric/5 px-5 py-3">
            <p className="font-display uppercase tracking-wider text-electric text-sm">
              Military, first responder &amp; student discounts
            </p>
            <p className="text-bone/70 text-sm mt-1">
              Remote Coaching is <span className="text-electric">$350/mo</span> for military,
              and <span className="text-electric">$300/mo</span> for first responders &amp; students.
              Ask for your code before checkout.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                {t.packageId ? (
                  <CheckoutButton packageId={t.packageId} className={btnCls}>
                    {t.cta.label} →
                  </CheckoutButton>
                ) : (
                  <a href={t.cta.href} className={btnCls}>
                    {t.cta.label} →
                  </a>
                )}
              </div>
            );
          })}
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
