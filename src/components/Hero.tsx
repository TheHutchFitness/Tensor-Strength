export default function Hero() {
  return (
    <section id="top" className="relative text-bone overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 md:py-40">
        <div className="max-w-3xl bg-ink/45 backdrop-blur-sm border border-bone/10 px-5 py-7 sm:px-6 sm:py-8 md:px-10 md:py-10">
          <p className="glow font-display uppercase tracking-[0.22em] sm:tracking-[0.3em] text-bone text-xs sm:text-sm mb-5 sm:mb-6">
            Private coaching · Member training system
          </p>
          <h1 className="glow font-display uppercase text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-700 leading-[0.95]">
            Train with
            <br />
            <span className="text-electric">intent.</span>
          </h1>
          <p className="mt-6 sm:mt-8 max-w-xl text-base sm:text-lg md:text-xl text-bone/85 leading-relaxed">
            A focused strength system for people who value excellent coaching, clear
            progression, and training that fits a real life. Start independently or
            work one-to-one with the Tensor team.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a
              href="#pricing"
              className="bg-electric text-ink px-6 sm:px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors text-center min-h-[52px]"
            >
              Explore membership
            </a>
            <a
              href="/apply"
              className="border-2 border-bone px-6 sm:px-8 py-4 font-display uppercase tracking-wider hover:bg-bone hover:text-ink transition-colors text-center min-h-[52px]"
            >
              Work with a coach
            </a>
          </div>

          <a
            href="#membership-path"
            className="mt-5 inline-flex items-center gap-2 font-display uppercase tracking-wider text-sm text-bone/65 hover:text-electric transition-colors"
          >
            Find the right path <span aria-hidden>↓</span>
          </a>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
            <a
              href="/clients"
              className="font-display uppercase tracking-wider text-sm text-bone/80 border-b-2 border-electric hover:text-electric transition-colors"
            >
              Member portal
            </a>
            <a
              href="/meet-the-team"
              className="font-display uppercase tracking-wider text-sm text-bone/80 border-b-2 border-bone/40 hover:text-electric hover:border-electric transition-colors"
            >
              Meet the team
            </a>
            <a
              href="/forum"
              className="font-display uppercase tracking-wider text-sm text-bone/80 border-b-2 border-bone/40 hover:text-electric hover:border-electric transition-colors"
            >
              Community
            </a>
          </div>

          <dl className="mt-9 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-6 max-w-xl border-t border-bone/20 pt-6 sm:pt-8">
            {[
              { n: "12", l: "Years coaching" },
              { n: "1:1", l: "Private support available" },
              { n: "24/7", l: "The Fit Effect access" },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-display text-2xl md:text-4xl text-electric font-700 leading-tight">
                  {s.n}
                </dt>
                <dd className="text-[10px] sm:text-xs md:text-sm uppercase tracking-wider text-bone/80 mt-1 leading-tight">
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
