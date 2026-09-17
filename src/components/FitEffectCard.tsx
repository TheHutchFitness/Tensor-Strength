const IMG =
  "https://customer-assets-39nsmqrw.emergentagent.net/job_trainer-profiles-2/artifacts/5qbgxvsl_2026-05-07.png";

const HIGHLIGHTS = ["24/7 member access", "Group classes included", "Ladies-only training area", "Free coffee in-club"];

export default function FitEffectCard() {
  return (
    <section id="fit-effect" className="py-20 md:py-28 border-t border-bone/10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
          In-person partner · Paris, Ontario
        </p>
        <div className="grid lg:grid-cols-2 gap-8 items-stretch border-2 border-bone/15 bg-ink/30 overflow-hidden">
          <a href="https://thefiteffectparis.ca/memberships/" target="_blank" rel="noopener noreferrer" className="block group">
            <img src={IMG} alt="The Fit Effect gym in Paris, Ontario" className="w-full h-full object-cover min-h-[300px] group-hover:opacity-95 transition-opacity" />
          </a>
          <div className="p-8 md:p-10">
            <h2 className="glow font-display uppercase text-3xl md:text-5xl font-700 leading-tight">
              Train in person at<br /><span className="text-electric">The Fit Effect.</span>
            </h2>
            <p className="mt-4 text-bone/75 leading-relaxed">
              Tensor&apos;s home for in-person coaching. A serious local training environment
              with the access and amenities to make consistent work easier.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-bone/10 py-5">
              {HIGHLIGHTS.map((highlight) => (
                <p key={highlight} className="flex items-center gap-2 text-sm text-bone/70">
                  <span className="text-electric" aria-hidden>✦</span>{highlight}
                </p>
              ))}
            </div>

            <p className="mt-6 text-sm text-bone/65 leading-relaxed">
              <span className="font-display uppercase tracking-wider text-electric text-xs">Staffed hours</span>
              <span className="block mt-1">Mon–Fri 8:00 AM–7:45 PM · Sat 9:00 AM–4:45 PM · Sun 11:00 AM–3:45 PM</span>
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="https://thefiteffectparis.ca/memberships/" target="_blank" rel="noopener noreferrer" className="inline-block bg-electric text-ink px-7 py-3.5 font-display uppercase tracking-wider hover:bg-bone transition-colors">
                Explore memberships →
              </a>
              <a href="https://thefiteffectparis.ca" target="_blank" rel="noopener noreferrer" className="inline-block border border-bone/30 text-bone px-7 py-3.5 font-display uppercase tracking-wider hover:border-electric hover:text-electric transition-colors">
                Visit site
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
