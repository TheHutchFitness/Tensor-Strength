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
    tagline: "A real account, not a fake trial.",
    features: [
      "Starter programs and training guides",
      "Program Finder and free tools",
      "Community access",
      "A place to explore Tensor Strength before paying",
    ],
    cta: { label: "Create free account", href: "/login?signup=1" },
  },
  {
    name: "Core",
    price: "$9.99 CAD",
    cadence: "/ month",
    tagline: "The complete Tensor Strength training system.",
    featured: true,
    features: [
      "Full Client Portal and cloud workout logging",
      "Programs, exercise help, progress and nutrition tools",
      "Quests, community and member features",
      "Cancel or pause without losing your training data",
    ],
    packageId: "monthly_9_99",
    cta: { label: "Join Core — $9.99 CAD/mo" },
  },
  {
    name: "Tensor AI Beta",
    price: "$12.99 CAD",
    cadence: "/ month",
    tagline: "Founding beta pricing.",
    features: [
      "Everything in Core",
      "Specialist help for gym, sport, and athletics",
      "Uses your logged training, not generic fitness chat",
      "Everyday answers plus deeper reasoning when the work is hard",
    ],
    packageId: "tensor_ai_beta_12_99",
    cta: { label: "Join AI Beta — $12.99 CAD/mo" },
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden py-24 md:py-32">
      <div className="stripe-bg absolute inset-0 opacity-15" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="glow mb-6 font-display uppercase tracking-[0.3em] text-electric text-sm">
            Membership
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Start free.
            <br />
            <span className="text-electric">Upgrade when it earns it.</span>
          </h2>
          <p className="mt-6 leading-relaxed text-bone/70">
            Core is the full training system. Tensor AI Beta is a gym, sport, and
            athletics specialist — not a generic chatbot. No annual plan while
            the product is changing quickly.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => {
            const buttonClass =
              "mt-6 block w-full px-5 py-3 text-center font-display uppercase tracking-wider text-sm transition-colors " +
              (tier.featured
                ? "bg-electric text-ink hover:bg-bone"
                : "border-2 border-bone hover:bg-bone hover:text-ink");

            return (
              <div
                key={tier.name}
                className={
                  "flex flex-col border p-6 transition-colors " +
                  (tier.featured
                    ? "border-electric bg-electric/10"
                    : "border-bone/15 bg-ink/30 backdrop-blur-sm hover:border-bone/30")
                }
              >
                <p className="font-display uppercase tracking-wider text-bone">
                  {tier.name}
                </p>

                {tier.featured && (
                  <p className="mt-2 inline-block w-fit bg-electric px-2 py-0.5 font-display uppercase tracking-wider text-[10px] text-ink">
                    Most members start here
                  </p>
                )}

                <p className="mt-4 font-display text-3xl font-700 leading-none text-electric">
                  {tier.price}
                </p>
                <p className="mt-1 text-xs text-bone/50">{tier.cadence}</p>
                <p className="mt-3 text-sm leading-relaxed text-bone/70">
                  {tier.tagline}
                </p>

                <ul className="mt-5 grid flex-1 gap-2">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-xs leading-relaxed text-bone/70"
                    >
                      <span className="shrink-0 text-electric">→</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier.packageId ? (
                  <CheckoutButton
                    packageId={tier.packageId}
                    className={buttonClass}
                  >
                    {tier.cta.label}
                  </CheckoutButton>
                ) : (
                  <a href={tier.cta.href} className={buttonClass}>
                    {tier.cta.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div
          id="coaching"
          className="mt-10 scroll-mt-24 border border-bone/15 bg-ink/25 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6"
        >
          <div>
            <p className="font-display uppercase tracking-[0.2em] text-[11px] text-electric">
              Want a human coach?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-bone/70">
              In-person and remote coaching are available separately for people
              who want individualized programming, form review, accountability
              and direct decisions with Hutch.
            </p>
          </div>

          <a
            href="/apply"
            className="mt-4 inline-block shrink-0 border-2 border-electric px-5 py-3 font-display uppercase tracking-wider text-xs text-electric transition-colors hover:bg-electric hover:text-ink sm:mt-0"
          >
            Apply for coaching →
          </a>
        </div>

        <p className="mt-6 max-w-xl text-xs leading-relaxed text-bone/40">
          First-responder, military and student rates are available. Contact
          Tensor Strength for current eligibility and rates.
        </p>
      </div>
    </section>
  );
}
