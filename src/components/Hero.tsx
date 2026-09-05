export default function Hero() {
  return (
    <section id="top" className="relative text-bone overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-40">
        <div className="max-w-3xl bg-ink/45 backdrop-blur-sm border border-bone/10 px-6 py-8 md:px-10 md:py-10">
          <p className="glow font-display uppercase tracking-[0.3em] text-bone text-sm mb-6">
            Strength — Power — Performance
          </p>
          <h1 className="glow font-display uppercase text-5xl md:text-7xl lg:text-8xl font-700 leading-[0.95]">
            Build the body
            <br />
            that <span className="text-electric">performs.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg md:text-xl text-bone/85 leading-relaxed">
            Tensor Strength is a strength and performance brand for athletes who want
            real results — built through expert coaching, proven methods, and zero
            gimmicks. We&apos;re proud to work with first responders and university &amp;
            high-school athletes, with special discounts for each. No fluff. Just work
            that pays off.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href="#contact"
              className="bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors text-center"
            >
              Apply for Coaching
            </a>
            <a
              href="#professionals"
              className="border-2 border-bone px-8 py-4 font-display uppercase tracking-wider hover:bg-bone hover:text-ink transition-colors text-center"
            >
              Meet the Team
            </a>
          </div>

          <a
            href="#program"
            className="mt-4 inline-flex items-center gap-2 bg-electric/10 border-2 border-electric text-electric px-8 py-4 font-display uppercase tracking-wider hover:bg-electric hover:text-ink transition-colors text-center w-full sm:w-auto"
          >
            Get a Custom Program — $200 →
          </a>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <a
              href="#pricing"
              className="font-display uppercase tracking-wider text-sm text-bone/80 border-b-2 border-electric hover:text-electric transition-colors"
            >
              View Pricing
            </a>
            <a
              href="/apply"
              className="font-display uppercase tracking-wider text-sm text-bone/80 border-b-2 border-bone/40 hover:text-electric hover:border-electric transition-colors"
            >
              Apply
            </a>
            <a
              href="#professionals"
              className="font-display uppercase tracking-wider text-sm text-bone/80 border-b-2 border-bone/40 hover:text-electric hover:border-electric transition-colors"
            >
              Professionals
            </a>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-6 max-w-xl border-t border-bone/20 pt-8">
            {[
              { n: "15+", l: "Years Experience" },
              { n: "All Levels", l: "Pro, Amateur & Non-Athletes" },
              { n: "100%", l: "No-BS Guarantee" },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-display text-2xl md:text-4xl text-electric font-700 leading-tight">
                  {s.n}
                </dt>
                <dd className="text-xs md:text-sm uppercase tracking-wider text-bone/80 mt-1">
                  {s.l}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
