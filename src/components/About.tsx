export default function About() {
  return (
    <section id="about" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            The Philosophy
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Strength isn&apos;t an aesthetic.
            <br />
            It&apos;s a <span className="text-electric">capacity.</span>
          </h2>
          <div className="mt-8 space-y-5 text-lg text-bone/80 leading-relaxed">
            <p>
              Most fitness content sells you a look. We build athletes who can actually
              do something with their bodies — lift more, move better, last longer, and
              walk into any room knowing they put in the work.
            </p>
            <p>
              That means proven programming, intelligent progression, and honest feedback.
              No fad circuits. No influencers flexing for the camera. Just coaching that
              meets you where you are and pushes you to where you said you wanted to go.
            </p>
            <p className="glow font-display uppercase text-xl text-bone">
              Train like it matters. Because it does.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="bg-electric text-ink px-6 py-4 font-display uppercase tracking-wider hidden sm:block w-fit">
            Head Coach
          </div>
          <div className="relative mt-0 sm:mt-4 aspect-[4/5] border-4 border-electric overflow-hidden bg-ink">
            <img
              src="https://us.chat-img.sintra.ai/0d1255aa-5bdd-49c7-9b93-64af3dfc8e4f/e1af4534-8dc1-462e-92df-7d2eb92de149/image.png?w=1024&h=1024"
              alt="Hutch squatting heavy in the rack"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
