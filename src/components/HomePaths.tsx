const paths = [
  {
    index: "01",
    title: "Train independently",
    description:
      "A quiet, complete system for self-directed training: programmes, workout logging, progression tools, and the member community.",
    action: "Explore membership",
    href: "#pricing",
  },
  {
    index: "02",
    title: "Work with a coach",
    description:
      "For people who want decisions made with them—not for them. Get a plan built around your goals, schedule, equipment, and feedback.",
    action: "Apply for coaching",
    href: "/apply",
    featured: true,
  },
  {
    index: "03",
    title: "Meet the professionals",
    description:
      "See the people and disciplines behind Tensor Strength, then choose the level of support that fits your next training block.",
    action: "Meet the team",
    href: "/meet-the-team",
  },
];

export default function HomePaths() {
  return (
    <section id="membership-path" className="border-y border-bone/10 bg-ink/25 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">Start with clarity</p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            One standard.<br /><span className="text-electric">Your right level.</span>
          </h2>
          <p className="mt-5 text-bone/70 leading-relaxed">
            Whether you&apos;re training on your own, looking for personal coaching, or exploring the team, each route has a clear next step.
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
