"use client";

const articles = [
  {
    tag: "Training",
    title: "Why your accessory work is quietly building your main lifts",
    read: "Read PDF",
    href: "/library/tensor-strength-accessory-lifts.pdf",
  },
  {
    tag: "Mindset",
    title: "Why consistency is king",
    read: "Read PDF",
    href: "/library/tensor-strength-consistency.pdf",
  },
  {
    tag: "Programming",
    title: "Progressive overload without destroying your joints",
    read: "Read PDF",
    href: "/library/tensor-strength-progressive-overload.pdf",
  },
];

// Weekly Drop videos were removed from the home page per Hutch's request.
// If you want to bring them back, re-add a videos array and a VideoCard here.

export default function Content() {
  return (
    <section id="content" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
              The Library
            </p>
            <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
              Read, watch,
              <br />
              <span className="text-electric">then train.</span>
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((a) => {
            const Tag = a.href ? "a" : "div";
            return (
              <Tag
                key={a.title}
                {...(a.href
                  ? { href: a.href, target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group border-2 border-bone/15 hover:border-electric transition-colors p-8 flex flex-col bg-ink/30 backdrop-blur-sm"
              >
                <span className="font-display uppercase tracking-wider text-xs text-electric">
                  {a.tag}
                </span>
                <h3 className="font-display uppercase text-xl font-600 leading-snug mt-4 flex-1 text-bone group-hover:text-electric transition-colors">
                  {a.title}
                </h3>
                <div className="mt-6 flex items-center justify-between text-sm text-bone/50">
                  <span>{a.read}</span>
                  <span className="font-display uppercase tracking-wider group-hover:text-electric transition-colors">
                    {a.href ? "Open PDF →" : "Read →"}
                  </span>
                </div>
              </Tag>
            );
          })}
        </div>
      </div>
    </section>
  );
}
