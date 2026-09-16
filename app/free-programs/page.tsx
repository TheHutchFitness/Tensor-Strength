import type { Metadata } from "next";
import Footer from "../../src/components/Footer";
import HutchTouchPreview from "../../src/components/HutchTouchPreview";

export const metadata: Metadata = {
  title: "Free Programs — Tensor Strength",
  description:
    "Six free 1-week training programs from Tensor Strength — athletic performance, strength, hypertrophy, general health, home, and bodyweight. No sign-up required.",
};

const programs = [
  {
    file: "01_tensor_athletic_performance.pdf",
    title: "Athletic Performance",
    tag: "Power & Speed",
    desc: "Jumps, sprints, and heavy compound work to build explosiveness and make you a better athlete.",
  },
  {
    file: "02_tensor_strength_focus.pdf",
    title: "Strength Focus",
    tag: "Get Strong",
    desc: "Squat, bench, deadlift, and press built around progressive overload for raw, usable strength.",
  },
  {
    file: "03_tensor_general_health.pdf",
    title: "General Health",
    tag: "Start Here",
    desc: "Balanced full-body training for energy, longevity, and staying capable — ideal if you're new.",
  },
  {
    file: "04_tensor_hypertrophy.pdf",
    title: "Hypertrophy",
    tag: "Build Muscle",
    desc: "Higher-volume training that targets every muscle group for size and definition.",
  },
  {
    file: "05_tensor_home_minimal_equipment.pdf",
    title: "Home / Minimal Equipment",
    tag: "Small Setup",
    desc: "A full week you can run with just dumbbells or a few basics — no commercial gym required.",
  },
  {
    file: "06_tensor_anywhere_bodyweight.pdf",
    title: "Anywhere / Bodyweight",
    tag: "Zero Gear",
    desc: "Train anywhere — hotel, park, living room — using nothing but your bodyweight.",
  },
];

export default function FreeProgramsPage() {
  return (
    <>
      {/* Minimal public header */}
      <header className="sticky top-0 z-50 bg-ink/80 backdrop-blur text-bone border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a
            href="/free-programs"
            className="flex items-center gap-3"
          >
            <img
              src="/tensor-strength-logo.jpg"
              alt="Tensor Strength"
              className="h-11 w-11 object-contain rounded-full"
            />
            <span className="font-display uppercase tracking-wider text-sm hidden sm:block">
              Tensor Strength
            </span>
          </a>
          <a
            href="/apply"
            className="font-display uppercase text-sm tracking-wider text-bone hover:text-electric transition-colors mr-4 hidden sm:inline"
          >
            Apply
          </a>
          <a
            href="/login"
            className="bg-electric text-ink px-5 py-2 font-display uppercase text-sm tracking-wider hover:bg-bone transition-colors"
          >
            Member Login
          </a>
        </div>
      </header>

      <main className="text-bone min-h-screen">
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-6">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
              Free Programs
            </p>
            <h1 className="glow font-display uppercase text-4xl md:text-6xl font-700 leading-tight">
              Train free.
              <br />
              <span className="text-electric">No sign-up.</span>
            </h1>
            <p className="mt-6 text-bone/80 max-w-2xl leading-relaxed">
              Six complete 1-week training programs, free for everyone. Pick the one
              that matches your goal and your setup, download the PDF, and get to work.
              When you&apos;re ready for a full program built around you, the{" "}
              <a href="/login" className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors">
                membership and coaching
              </a>{" "}
              take it further.
            </p>

            <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((p) => (
                <a
                  key={p.file}
                  href={`/programs/${p.file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-bone/15 bg-ink/30 backdrop-blur-sm p-6 hover:border-electric transition-colors flex flex-col"
                >
                  <span className="font-display uppercase tracking-wider text-[10px] text-steel border border-line inline-block w-fit px-2 py-0.5">
                    {p.tag}
                  </span>
                  <p className="font-display uppercase tracking-wider text-bone text-xl mt-4">
                    {p.title}
                  </p>
                  <p className="text-sm text-bone/60 mt-2 leading-relaxed flex-1">
                    {p.desc}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 font-display uppercase tracking-wider text-sm text-electric group-hover:text-bone transition-colors">
                    Download PDF →
                  </span>
                </a>
              ))}
            </div>

            <div className="mt-16 border-2 border-electric/40 bg-electric/10 p-8 max-w-3xl">
              <p className="glow font-display uppercase text-xl text-electric">
                Want more than a week?
              </p>
              <p className="mt-3 text-bone/80 leading-relaxed">
                The full Client Portal has the Hutch Touch performance rotation, a workout log,
                calculators, exercise and warmup libraries, and weekly check-ins — plus
                custom and 1:1 coaching options.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/login"
                  className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
                >
                  Create an account →
                </a>
                <a
                  href="/login?from=/clients"
                  className="border-2 border-bone px-6 py-3 font-display uppercase tracking-wider hover:bg-bone hover:text-ink transition-colors"
                >
                  Client Portal
                </a>
              </div>
            </div>
          </div>
        </section>
        <section className="relative overflow-hidden pb-20">
          <div className="relative mx-auto max-w-6xl px-6">
            <HutchTouchPreview />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
