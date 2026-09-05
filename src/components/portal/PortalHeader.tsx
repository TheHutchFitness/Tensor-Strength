"use client";

const NAV = [
  { href: "/clients/about", label: "About Me" },
  { href: "/forum", label: "Forum" },
  { href: "/clients/workout-log", label: "Workout Tracker" },
  { href: "/clients/nutrition", label: "Nutrition Tracker" },
  { href: "/clients/check-in", label: "Check-In" },
  { href: "/clients#tools", label: "Tools" },
];

export default function PortalHeader({ simple = false }: { simple?: boolean }) {
  const items = simple ? [{ href: "/clients", label: "Client Portal" }] : NAV;
  return (
    <header className="sticky top-0 z-50 bg-ink/90 backdrop-blur text-bone border-b-2 border-electric">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-4">
        <a href="/clients" className="flex items-center gap-3 shrink-0">
          <img
            src="/tensor-strength-logo.jpg"
            alt="Tensor Strength"
            className="h-9 w-9 object-contain rounded-full"
          />
          <span className="font-display uppercase tracking-wider text-bone/80 text-sm hidden sm:inline">
            Client Portal
          </span>
        </a>

        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {items.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="whitespace-nowrap px-2.5 sm:px-3 py-2 font-display uppercase text-[11px] sm:text-xs tracking-wider text-bone/70 hover:text-electric transition-colors"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <a
          href="/"
          className="shrink-0 border border-bone/30 px-3 sm:px-4 py-2 font-display uppercase text-[11px] sm:text-xs tracking-wider hover:border-electric hover:text-electric transition-colors"
        >
          ← Main
        </a>
      </div>
    </header>
  );
}
