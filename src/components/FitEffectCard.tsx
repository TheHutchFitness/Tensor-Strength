export default function FitEffectCard() {
  const IMG =
    "https://customer-assets-39nsmqrw.emergentagent.net/job_trainer-profiles-2/artifacts/5qbgxvsl_2026-05-07.png";
  return (
    <section id="fit-effect" className="py-20 md:py-28 border-t border-bone/10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
          Partner Gym
        </p>
        <div className="grid md:grid-cols-2 gap-8 items-center border-2 border-bone/15 bg-ink/30 overflow-hidden">
          <a
            href="https://thefiteffectparis.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <img
              src={IMG}
              alt="The Fit Effect Paris — free 2 week trial"
              className="w-full h-full object-cover max-h-[460px] group-hover:opacity-95 transition-opacity"
            />
          </a>
          <div className="p-8 md:p-10">
            <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
              Train at <span className="text-electric">The Fit Effect.</span>
            </h2>
            <p className="mt-5 text-bone/75 leading-relaxed">
              Our partner gym in Paris, Ontario — 24/7 access, fitness classes,
              free weights and cardio. New here? Grab a{" "}
              <span className="text-electric">free 2‑week trial</span> and put in
              the work.
            </p>
            <p className="mt-4 text-sm text-bone/50 uppercase tracking-wider">
              70 Hartley Ave, Paris · 24/7 · Classes · Weights · Cardio
            </p>
            <a
              href="https://thefiteffectparis.ca/memberships/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
            >
              Start your free 2‑week trial →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
