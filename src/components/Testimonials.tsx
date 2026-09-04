const results = [
  {
    quote:
      "Completed my testing today and had an incredible result. I finished 2nd doing 225lbs bench press for 20 reps — the only person who beat me was a 24-year-old.",
    name: "Nolan Ayres",
    detail: "1st-Year York Football",
    highlight: "225 lb × 20",
    highlightLabel: "Bench Press",
  },
  {
    quote:
      "I trained with Hutch for 8 sessions and in that short time managed to improve enough that I passed my Air Force firefighter physical testing, improving my score significantly from the first time I tried the test.",
    name: "Rachel",
    detail: "Air Force Firefighter Candidate",
    highlight: "8 sessions",
    highlightLabel: "To pass testing",
  },
  {
    quote:
      "I contacted Hutch with the goal of losing 80lbs. Upon first meeting, Hutch informed me that he wouldn't do that because it's unhealthy and would lead to issues like loose skin and a lack of energy. 3 months later I am down 22lbs and feel the best I have in a long time. I'm also back to playing badminton — something Hutch made an effort to practice with me for extra motivation.",
    name: "Karina Oliviara",
    detail: "Down 22 lbs in 3 months",
    highlight: "22 lb down",
    highlightLabel: "In 3 months",
  },
  {
    quote:
      "Since training I have gained 10lbs of muscle and went from deadlifting 45lbs to 200lbs and improved my mobility all while getting rid of an old nagging shoulder pain... in my 40s.",
    name: "Kat Graham",
    detail: "10 lb muscle gained · 45 → 200 lb deadlift",
    highlight: "200 lb DL",
    highlightLabel: "From 45 lb",
  },
];

export default function Testimonials() {
  return (
    <section id="proof" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            The Proof
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Results don&apos;t lie.
            <br />
            <span className="text-electric">Neither do we.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {results.map((r) => (
            <figure
              key={r.name}
              className="border border-bone/15 bg-navy-deep/40 backdrop-blur-sm p-8 flex flex-col"
            >
              <div className="text-electric font-display text-5xl leading-none mb-4">&ldquo;</div>
              <blockquote className="text-bone/90 leading-relaxed flex-1">
                {r.quote}
              </blockquote>
              <figcaption className="mt-6 border-t border-bone/15 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display uppercase tracking-wider">{r.name}</p>
                    <p className="text-sm text-electric mt-1">{r.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-2xl text-electric font-700 leading-none">
                      {r.highlight}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-bone/60 mt-1">
                      {r.highlightLabel}
                    </p>
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-12 font-display uppercase tracking-wider text-bone/50 text-sm">
          Real clients. Real numbers. The next one could be yours —{" "}
          <a href="#contact" className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors">
            apply for coaching
          </a>
          .
        </p>
      </div>
    </section>
  );
}
