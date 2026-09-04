"use client";

export default function ContactForm() {
  return (
    <section id="contact" className="text-bone py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-6">
        <p className="glow font-display uppercase tracking-[0.3em] text-bone/70 text-sm mb-6">
          Apply for Coaching
        </p>
        <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
          Ready to put
          <br />
          in the <span className="text-electric">work?</span>
        </h2>
        <p className="mt-6 text-bone/80 max-w-xl leading-relaxed">
          Tell me where you are and where you want to be. I review every application
          myself and reply to the ones I can genuinely help.
        </p>

        {/* Google Form application */}
        <div className="mt-10 border-2 border-electric/30 bg-ink/40 backdrop-blur-sm p-2 sm:p-3">
          <iframe
            src="https://docs.google.com/forms/d/e/1FAIpQLSesSa37tKkqtDpDku6svEpaAFoBbsrzdnRcxqyM1inuMluSjA/viewform?embedded=true"
            title="Apply for Coaching — Tensor Strength"
            className="w-full"
            style={{ height: "1500px", border: 0 }}
            loading="lazy"
          >
            Loading the application form…
          </iframe>
        </div>

        <p className="mt-6 text-[11px] text-bone/40 leading-relaxed">
          Submitting is free — no payment is taken on the site. I review every
          application myself and reply within 48 hours.
        </p>
      </div>
    </section>
  );
}
