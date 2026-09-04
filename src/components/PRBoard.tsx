import { prBoard } from "@/data/prBoard";

export default function PRBoard() {
  return (
    <section id="pr-board" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-10">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            The PR Board
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Real lifters.
            <br />
            <span className="text-electric">Real numbers.</span>
          </h2>
          <p className="mt-6 text-bone/70 leading-relaxed">
            Tensor Strength athletes putting in the work and getting results. This board
            updates as PRs come in — clients submit through the portal, the best ones land
            here.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {prBoard.map((p) => (
            <div
              key={p.id}
              className="border border-bone/15 bg-ink/30 backdrop-blur-sm p-6 flex flex-col"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-display uppercase tracking-wider text-bone">{p.firstName}</p>
                <p className="font-display uppercase tracking-wider text-[10px] text-electric border border-electric/40 px-2 py-0.5">
                  {p.lift}
                </p>
              </div>
              <p className="font-display text-2xl md:text-3xl text-electric font-700 leading-none mt-4">
                {p.result}
              </p>
              {p.note && (
                <p className="text-sm text-bone/60 mt-3 leading-relaxed">{p.note}</p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-bone/40 leading-relaxed max-w-xl">
          Want your name on this board?{" "}
          <a href="/#contact" className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors">
            Apply for coaching
          </a>{" "}
          — clients submit PRs through the portal.
        </p>
      </div>
    </section>
  );
}
