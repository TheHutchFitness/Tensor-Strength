"use client";

import CheckoutButton from "./CheckoutButton";

export default function Hero() {
  return (
    <section id="top" className="relative text-bone overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 md:py-40">
        <div className="max-w-3xl bg-ink/45 backdrop-blur-sm border border-bone/10 px-5 py-7 sm:px-6 sm:py-8 md:px-10 md:py-10">
          <p className="glow font-display uppercase tracking-[0.22em] sm:tracking-[0.3em] text-bone text-xs sm:text-sm mb-5 sm:mb-6">
            Independent fitness + technology
          </p>
          <h1 className="glow font-display uppercase text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-700 leading-[0.95]">
            Strength,
            <br />
            <span className="text-electric">built with intent.</span>
          </h1>
          <p className="mt-6 sm:mt-8 max-w-xl text-base sm:text-lg md:text-xl text-bone/85 leading-relaxed">
            You already have an account. Unlock the full portal — $9.99 CAD/month.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <CheckoutButton
              packageId="monthly_9_99"
              className="bg-electric text-ink px-6 sm:px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors text-center min-h-[52px]"
            >
              Join — $9.99 CAD/mo
            </CheckoutButton>
            <a
              href="#pricing"
              className="border-2 border-bone px-6 sm:px-8 py-4 font-display uppercase tracking-wider hover:bg-bone hover:text-ink transition-colors text-center min-h-[52px]"
            >
              See plans
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
