import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { professionals } from "@/data/professionals";

// Pre-render one page per professional at build time (static export).
export function generateStaticParams() {
  return professionals.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = professionals.find((x) => x.slug === slug);
  if (!p) return { title: "Not found — Tensor Strength" };
  return {
    title: `${p.name} — ${p.title} | Tensor Strength`,
    description: p.shortBio,
    openGraph: {
      title: `${p.name} — ${p.title} | Tensor Strength`,
      description: p.shortBio,
      type: "profile",
    },
  };
}

export default async function ProfessionalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = professionals.find((x) => x.slug === slug);
  if (!p) notFound();

  return (
    <>
      <Navbar />
      <main>
        {/* Profile header */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 stripe-bg opacity-15" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-6 grid md:grid-cols-[1fr_1.3fr] gap-12 items-center">
            {/* Photo */}
            <div className="relative order-2 md:order-1">
              <div className="bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hidden sm:block w-fit">
                {p.title}
              </div>
              <div className="relative mt-0 sm:mt-4 aspect-[4/5] border-4 border-electric overflow-hidden bg-ink">
                <img
                  src={p.photo}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Name + bio */}
            <div className="order-1 md:order-2">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-5">
                {p.location}
              </p>
              <h1 className="glow font-display uppercase text-5xl md:text-6xl font-700 leading-[0.95]">
                {p.name}
              </h1>
              <p className="mt-4 font-display uppercase tracking-wider text-bone/70 text-lg">
                {p.title}
              </p>
              <div className="mt-8 space-y-5 text-lg text-bone/80 leading-relaxed">
                {p.bio.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Credentials + specialties */}
        <section className="py-16 md:py-20 border-t border-bone/10">
          <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-12">
            {/* Credentials */}
            <div>
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Credentials
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight mb-8">
                The <span className="text-electric">resume.</span>
              </h2>
              <ul className="grid gap-3">
                {p.credentials.map((c) => (
                  <li key={c} className="flex items-start gap-3">
                    <span className="text-electric font-display mt-0.5">⚡</span>
                    <span className="text-bone/85 leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Specialties */}
            <div>
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Specialties
              </p>
              <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight mb-8">
                What they <span className="text-electric">coach.</span>
              </h2>
              <div className="flex flex-wrap gap-3">
                {p.specialties.map((s) => (
                  <span
                    key={s}
                    className="border-2 border-bone/20 hover:border-electric transition-colors px-4 py-2 font-display uppercase tracking-wider text-sm text-bone/85"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-10">
                <a
                  href="/#contact"
                  className="inline-block bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
                >
                  Train with {p.name} →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Full testimonials */}
        {p.testimonials.length > 0 && (
          <section className="py-20 md:py-28 relative overflow-hidden border-t border-bone/10">
            <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
            <div className="relative mx-auto max-w-6xl px-6">
              <div className="max-w-2xl mb-14">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                  The Proof
                </p>
                <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
                  Results don&apos;t lie.
                  <br />
                  <span className="text-electric">Neither do we.</span>
                </h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {p.testimonials.map((r) => (
                  <figure
                    key={r.name}
                    className="border border-bone/15 bg-navy-deep/40 backdrop-blur-sm p-8 flex flex-col"
                  >
                    <div className="text-electric font-display text-5xl leading-none mb-4">
                      &ldquo;
                    </div>
                    <blockquote className="text-bone/90 leading-relaxed flex-1">
                      {r.quote}
                    </blockquote>
                    <figcaption className="mt-6 border-t border-bone/15 pt-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display uppercase tracking-wider">
                            {r.name}
                          </p>
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
                <a
                  href="/#contact"
                  className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors"
                >
                  apply for coaching
                </a>
                .
              </p>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
