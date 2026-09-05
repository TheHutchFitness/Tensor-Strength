const IMG =
  "https://customer-assets-39nsmqrw.emergentagent.net/job_trainer-profiles-2/artifacts/5qbgxvsl_2026-05-07.png";

const PLANS = [
  { name: "Biweekly", price: "$24.98", per: "+ HST / biweekly", href: "https://fiteffect.antaris.ca/v2/join.php?loc_id=2&os_reason=Buy%20Membership&mat_id=6" },
  { name: "Monthly", price: "$49.95", per: "+ HST / month", href: "https://fiteffect.antaris.ca/v2/join.php?loc_id=2&os_reason=Buy%20Membership&mat_id=4" },
  { name: "Annual", price: "$539.40", per: "+ HST / year", href: "https://fiteffect.antaris.ca/v2/join.php?loc_id=2&os_reason=Buy%20Membership&mat_id=2" },
  { name: "VIP (+ tanning & hydro)", price: "$74.95", per: "+ HST / month", href: "https://fiteffect.antaris.ca/v2/join.php?loc_id=2&os_reason=Buy%20Membership&mat_id=34" },
];

export default function FitEffectCard() {
  return (
    <section id="fit-effect" className="py-20 md:py-28 border-t border-bone/10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
          Partner Gym
        </p>
        <div className="grid lg:grid-cols-2 gap-8 items-stretch border-2 border-bone/15 bg-ink/30 overflow-hidden">
          <a href="https://thefiteffectparis.ca/memberships/" target="_blank" rel="noopener noreferrer" className="block group">
            <img src={IMG} alt="The Fit Effect Paris — free 2 week trial" className="w-full h-full object-cover min-h-[300px] group-hover:opacity-95 transition-opacity" />
          </a>
          <div className="p-8 md:p-10">
            <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
              Train at <span className="text-electric">The Fit Effect.</span>
            </h2>
            <p className="mt-4 text-bone/75 leading-relaxed">
              Our partner gym in Paris, Ontario — 24/7 access, group classes, ladies-only
              section, free coffee and more. New here? Grab a{" "}
              <span className="text-electric">free 2-week trial</span>.
            </p>

            {/* Membership prices */}
            <p className="mt-6 font-display uppercase tracking-wider text-electric text-sm">Membership prices</p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {PLANS.map((p) => (
                <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer" className="border border-bone/15 bg-ink/40 p-3 hover:border-electric transition-colors group">
                  <p className="text-[10px] uppercase tracking-wider text-bone/50">{p.name}</p>
                  <p className="font-display text-xl text-bone group-hover:text-electric transition-colors">{p.price}</p>
                  <p className="text-[10px] uppercase tracking-wider text-bone/40">{p.per}</p>
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-bone/50">
              Group classes by certified pros are <span className="text-electric">included</span> with every membership. Student &amp; senior discounts — call or visit.
            </p>

            {/* Staffed hours */}
            <p className="mt-6 font-display uppercase tracking-wider text-electric text-sm">Staffed hours</p>
            <p className="mt-1 text-sm text-bone/70">
              Mon–Fri 8:00 AM – 7:45 PM · Sat 9:00 AM – 4:45 PM · Sun 11:00 AM – 3:45 PM
              <span className="block text-xs text-bone/45 mt-1">Gym access is 24/7, 365. Classes &amp; the current schedule are posted in-club.</span>
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="https://thefiteffectparis.ca/memberships/" target="_blank" rel="noopener noreferrer" className="inline-block bg-electric text-ink px-7 py-3.5 font-display uppercase tracking-wider hover:bg-bone transition-colors">
                Start your free 2-week trial →
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
