const photos = [
  {
    src: "/images/achievable/tensor-training-squat.jpg",
    alt: "Athlete preparing to squat inside a strength rack",
    className: "md:mt-10",
  },
  {
    src: "/images/achievable/tensor-training-composure.jpg",
    alt: "Tensor Strength athlete in a focused training pose",
    className: "md:-mt-6",
  },
];

export default function AchievableResults() {
  return (
    <section className="border-y border-bone/10 bg-ink/20 py-20 md:py-28" aria-labelledby="achievable-title">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
        <div className="max-w-md lg:pb-5">
          <p className="font-display uppercase tracking-[0.3em] text-electric text-sm">The Tensor standard</p>
          <h2 id="achievable-title" className="mt-5 font-display uppercase text-4xl leading-tight md:text-5xl">
            Build strength with<br />
            <span className="text-electric">intent behind it.</span>
          </h2>
          <p className="mt-5 leading-relaxed text-bone/70">
            The standard is strength that performs, moves well, and lasts. Your plan is built around your starting point, your goals, and the work you are ready to put in.
          </p>
          <a href="/apply" className="mt-7 inline-flex font-display uppercase tracking-wider text-sm text-bone transition-colors hover:text-electric">
            Start a coaching conversation <span className="ml-2 text-electric">→</span>
          </a>
        </div>

        <div className="grid grid-cols-3 items-start gap-3 sm:gap-4">
          {photos.map((photo) => (
            <figure
              key={photo.src}
              className={"group relative overflow-hidden border border-bone/10 bg-ink " + photo.className}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                className="aspect-[3/4] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/45 to-transparent" />
            </figure>
          ))}
          <figure className="group relative overflow-hidden border border-electric/35 bg-ink">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/images/achievable/tensor-training-squat.jpg"
              className="aspect-[3/4] h-full w-full object-cover"
              aria-label="Short Tensor Strength training video"
            >
              <source src="/images/achievable/tensor-training-motion.mp4" type="video/mp4" />
              Your browser does not support video playback.
            </video>
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent px-3 pb-3 pt-8 font-display uppercase text-[9px] tracking-[0.16em] text-bone">
              Training in motion
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
