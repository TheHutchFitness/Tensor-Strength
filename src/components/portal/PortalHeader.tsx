"use client";

import { useEffect, useState } from "react";
import PortalTabBar from "./PortalTabBar";

import OfflineBadge from "./OfflineBadge";
import SyncIndicator from "./SyncIndicator";

const NAV = [
  { href: "/clients/workout-log", label: "Workout" },
  { href: "/clients/nutrition", label: "Nutrition" },
  { href: "/clients/progress", label: "Progress" },
  { href: "/clients/book", label: "Book" },
  { href: "/clients/check-in", label: "Check-In" },
  { href: "/quests", label: "Quests" },
  { href: "/forum", label: "Forum" },
  { href: "/clients/about", label: "About Me" },
];

export default function PortalHeader({ simple = false }: { simple?: boolean }) {
  const items = simple ? [{ href: "/clients", label: "Client Portal" }] : NAV;
  const [me, setMe] = useState<{ username?: string; picture?: string } | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((d) => setMe(d?.user || null)).catch(() => {});
  }, []);
  return (
    <>
    <header className="sticky top-0 z-50 bg-ink/90 backdrop-blur text-bone border-b-2 border-electric">
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
        <nav className="md:hidden flex flex-col px-6 pb-4 border-t border-bone/10 bg-ink/95">
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
