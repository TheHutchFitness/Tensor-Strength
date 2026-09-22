const paths = [
  {
    index: "01",
    title: "Start free",
    description:
      "A real limited account: starter programs, Program Finder, and guides. No fake trial wall.",
    action: "Create a free account",
    href: "/login?signup=1",
  },
  {
    index: "02",
    title: "Member system",
    description:
      "The full portal for $9.99/month — logging, libraries, The Hutch Touch, community. This is the default.",
    action: "Join $9.99/mo",
    href: "#pricing",
    featured: true,
  },
  {
    index: "03",
    title: "Optional coaching",
    description:
      "Custom program, remote coaching, or in-person. Available at checkout if you want it — not what we are pushing first.",
    action: "Coaching checkout",
    href: "#coaching",
  },
];

export default function HomePaths() {
  return (
    <section id="membership-path" className="border-y border-bone/10 bg-ink/25 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">Start with clarity</p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Get in.
            <br /><span className="text-electric">Build the data.</span>
          </h2>
          <p className="mt-5 text-bone/70 leading-relaxed">
            Free accounts and $9.99 memberships first. Coaching stays on the page as a quiet checkout.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {paths.map((path) => (
            <article
              key={path.index}
              className={
                "flex min-h-[280px] flex-col border p-7 md:p-8 " +
                (path.featured ? "border-electric bg-electric/10" : "border-bone/15 bg-ink/35")
              }
            >
              <span className="font-display text-sm tracking-[0.2em] text-electric">{path.index}</span>
              <h3 className="mt-9 font-display uppercase text-2xl leading-none text-bone">{path.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-bone/65">{path.description}</p>
              <a
                href={path.href}
                className="mt-auto pt-8 font-display uppercase tracking-wider text-sm text-bone hover:text-electric transition-colors"
              >
                {path.action} <span aria-hidden className="text-electric">→</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
