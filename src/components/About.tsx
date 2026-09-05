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
          <div className="relative aspect-[4/5] border-4 border-electric overflow-hidden bg-ink">
            <video
              src="/videos/coach.mp4"
              poster="/videos/coach-poster.jpg"
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              controls={false}
              aria-label="Tensor Strength training"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
