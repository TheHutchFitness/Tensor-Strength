export default function Footer() {
  return (
    <footer className="bg-ink/80 backdrop-blur text-bone py-14">
      <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between gap-10">
        <div className="max-w-sm">
          <img
            src="/tensor-strength-logo.jpg"
            alt="Tensor Strength"
            className="h-20 w-20 object-contain rounded-full"
          />
          <p className="mt-4 text-bone/60 leading-relaxed">
            Strength and performance coaching for athletes who want real results.
            Proven methods. No BS.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="glow font-display uppercase tracking-[0.3em] text-bone/40 text-xs mb-2">
            Navigate
          </p>
          {[
            { href: "/#about", label: "About" },
            { href: "/#professionals", label: "Professionals" },
            { href: "/#content", label: "Content" },
            { href: "/#programs", label: "Weekly Programs" },
            { href: "/#tools", label: "Free Tools" },
            { href: "/#pricing", label: "Pricing" },
            { href: "/#contact", label: "Apply" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="hover:text-electric transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="glow font-display uppercase tracking-[0.3em] text-bone/40 text-xs mb-2">
            Follow
          </p>
          {[
            { label: "Instagram", href: "https://www.instagram.com/thehutchfitness?igsi=bXM0b2t2cXFydTBj" },
            { label: "YouTube", href: "https://youtube.com/@thehutchtouchathletics?si=WWM0dNVbIvUjyskD" },
            { label: "TikTok", href: "https://www.tiktok.com/@thehutchfitness?_r=1&_t=ZS-99GdmGtS3n7" },
          ].map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-electric transition-colors">
              {s.label}
            </a>
          ))}
          <a href="/clients" className="mt-2 text-bone/50 hover:text-electric transition-colors text-xs">
            Client Portal →
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 mt-12 pt-6 border-t border-bone/10 text-xs text-bone/40 flex flex-col sm:flex-row justify-between gap-2">
        <p>© {new Date().getFullYear()} Tensor Strength. All rights reserved.</p>
        <p>Train hard. Train honest.</p>
      </div>
    </footer>
  );
}
