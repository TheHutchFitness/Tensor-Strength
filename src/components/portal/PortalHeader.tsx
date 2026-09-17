"use client";

import { useEffect, useState } from "react";
import PortalTabBar from "./PortalTabBar";

import OfflineBadge from "./OfflineBadge";
import SyncIndicator from "./SyncIndicator";

const PRIMARY_NAV = [
  { href: "/clients", label: "Home" },
  { href: "/clients/workout-log", label: "Train" },
  { href: "/clients/nutrition", label: "Nutrition" },
  { href: "/clients/progress", label: "Progress" },
  { href: "/clients/check-in", label: "Check-In" },
  { href: "/forum", label: "Community" },
];

const MORE_NAV = [
  { href: "/clients/book", label: "Book a session" },
  { href: "/clients/my-programs", label: "My programs" },
  { href: "/quests", label: "Quests & rewards" },
  { href: "/clients/about", label: "About me" },
];

export default function PortalHeader({ simple = false }: { simple?: boolean }) {
  const items = simple ? [{ href: "/clients", label: "Portal home" }, { href: "/forum", label: "Community" }] : PRIMARY_NAV;
  const [me, setMe] = useState<{ username?: string; picture?: string } | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((d) => setMe(d?.user || null)).catch(() => {});
  }, []);
  return (
    <>
    <header className="sticky top-0 z-50 bg-ink/90 backdrop-blur text-bone border-b border-line">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo (top-left) */}
        <a href="/clients" className="flex items-center gap-3 shrink-0">
          <img
            src="/tensor-strength-logo.jpg"
            alt="Tensor Strength"
            className="h-10 w-10 object-cover rounded-full ring-1 ring-electric/50"
          />
          <span className="font-display uppercase tracking-wider text-bone/80 text-sm hidden sm:inline">
            Client Portal
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {items.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="whitespace-nowrap px-3 py-2 font-display uppercase text-xs tracking-wider text-bone/70 hover:text-electric transition-colors"
            >
              {n.label}
            </a>
          ))}
          {!simple && (
            <details className="relative group">
              <summary className="list-none cursor-pointer whitespace-nowrap px-3 py-2 font-display uppercase text-xs tracking-wider text-bone/70 hover:text-electric transition-colors">
                More <span className="ml-1 text-[10px]">⌄</span>
              </summary>
              <div className="absolute right-0 top-full pt-3 hidden group-open:block">
                <div className="min-w-[190px] border border-line bg-ink/95 shadow-2xl">
                  {MORE_NAV.map((n) => (
                    <a key={n.href} href={n.href} className="block border-b border-line px-4 py-3 font-display uppercase text-[11px] tracking-wider text-bone/70 transition-colors hover:bg-white/[0.03] hover:text-electric last:border-b-0">
                      {n.label}
                    </a>
                  ))}
                </div>
              </div>
            </details>
          )}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="border border-bone/30 px-4 py-2 font-display uppercase text-xs tracking-wider hover:border-electric hover:text-electric transition-colors"
          >
            ← Main
          </a>
          {me?.picture ? (
            <img src={me.picture} alt={me.username || ""} title={me.username || ""} className="h-8 w-8 rounded-full object-cover border border-electric" />
          ) : null}
        </div>

        {/* Mobile: avatar + menu toggle (top-right) */}
        <div className="flex md:hidden items-center gap-3 shrink-0">
          {me?.picture ? (
            <img src={me.picture} alt={me.username || ""} className="h-8 w-8 rounded-full object-cover border border-electric" />
          ) : null}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex flex-col items-center justify-center gap-1 h-9 w-9 border border-bone/30 hover:border-electric transition-colors"
          >
            <span className={"block h-0.5 w-5 bg-bone transition-transform " + (open ? "translate-y-[6px] rotate-45" : "")} />
            <span className={"block h-0.5 w-5 bg-bone transition-opacity " + (open ? "opacity-0" : "")} />
            <span className={"block h-0.5 w-5 bg-bone transition-transform " + (open ? "-translate-y-[6px] -rotate-45" : "")} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="md:hidden flex max-h-[calc(100dvh-4rem)] flex-col overflow-y-auto px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-bone/10 bg-ink/95">
          {items.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="block py-3 font-display uppercase tracking-wider text-sm text-bone/80 hover:text-electric transition-colors border-b border-bone/5"
            >
              {n.label}
            </a>
          ))}
          {!simple && (
            <>
              <p className="pt-4 pb-1 font-display uppercase tracking-[0.18em] text-[10px] text-steel">More in your portal</p>
              {MORE_NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-bone/5 py-3 pl-3 font-display uppercase tracking-wider text-sm text-bone/80 transition-colors hover:text-electric"
                >
                  {n.label}
                </a>
              ))}
            </>
          )}
          <a
            href="/"
            onClick={() => setOpen(false)}
            className="block py-3 font-display uppercase tracking-wider text-sm text-electric"
          >
            ← Main Site
          </a>
        </nav>
      )}
    </header>
    <PortalTabBar />
    <OfflineBadge />
    <SyncIndicator />
    </>
  );
}
