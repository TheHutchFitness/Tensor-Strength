const CLIPS = [
  { src: "/videos/coaching1.mp4", poster: "/videos/coaching1-poster.jpg", label: "Barbell Coaching" },
  { src: "/videos/coaching2.mp4", poster: "/videos/coaching2-poster.jpg", label: "Strength Work" },
  { src: "/videos/coaching3.mp4", poster: "/videos/coaching3-poster.jpg", label: "Technique Cues" },
  { src: "/videos/coaching4.mp4", poster: "/videos/coaching4-poster.jpg", label: "In The Trenches" },
  { src: "/videos/coaching5.mp4", poster: "/videos/coaching5-poster.jpg", label: "Progression Work" },
  { src: "/videos/coaching6.mp4", poster: "/videos/coaching6-poster.jpg", label: "Accessory Focus" },
  { src: "/videos/coaching7.mp4", poster: "/videos/coaching7-poster.jpg", label: "Heavy Singles" },
  { src: "/videos/coaching8.mp4", poster: "/videos/coaching8-poster.jpg", label: "Form Under Load" },
];

export default function CoachingShowcase() {
  return (
    <section id="coaching" className="py-24 md:py-32 bg-ink/40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Coaching In Action
          </p>
          <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Real reps. <span className="text-electric">Real coaching.</span>
          </h2>
          <p className="mt-6 text-lg text-bone/80 leading-relaxed">
            No stock footage. This is what training with Tensor Strength actually looks
            like — heavy barbells, honest cues, and lifters putting in the work. Tap any
            clip to watch with sound.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {CLIPS.map((c) => (
            <figure
              key={c.src}
              className="group relative aspect-[9/16] overflow-hidden border-2 border-electric/40 hover:border-electric transition-colors bg-ink"
            >
              <video
                src={c.src}
                poster={c.poster}
                className="h-full w-full object-cover"
                controls
                playsInline
                preload="metadata"
                aria-label={`Tensor Strength coaching: ${c.label}`}
              />
              <figcaption className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/90 to-transparent px-3 pt-8 pb-3">
                <span className="font-display uppercase tracking-wider text-[11px] text-bone/90">
                  {c.label}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
