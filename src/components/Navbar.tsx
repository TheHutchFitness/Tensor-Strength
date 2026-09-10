"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "/meet-the-team", label: "Meet the Team" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#library", label: "Library" },
  { href: "/programs", label: "Programs" },
  { href: "/free-tools", label: "Free Tools" },
];

// Desktop nav. Items with `items` render a hover dropdown of sub-sections;
// items without render as a plain top-level link.
const menus = [
  { label: "Meet the Team", href: "/meet-the-team" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Library", href: "/#library" },
  {
    label: "Programs",
    href: "/programs",
    items: [
      { href: "/programs", label: "Programs" },
      { href: "/apply", label: "Custom Program" },
    ],
  },
  {
    label: "Free Tools",
    href: "/free-tools",
    items: [
      { href: "/free-tools?t=1rm", label: "1-Rep Max" },
      { href: "/free-tools?t=wilks", label: "Wilks & DOTS" },
      { href: "/free-tools?t=pr", label: "PR Tracker" },
      { href: "/free-tools?t=macros", label: "Macro Calculator" },
    ],
  },
];

type Me = { username: string; role: string; portalAccess: boolean; isTrainer?: boolean } | null;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ?? null))
      .catch(() => setMe(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-50 bg-ink/80 backdrop-blur text-bone border-b-2 border-electric">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center">
          <img
            src="/tensor-strength-logo.jpg"
            alt="Tensor Strength"
            className="h-11 w-11 object-contain rounded-full"
          />
        </a>

        <ul className="hidden md:flex items-center gap-6">
          {menus.map((m) => (
            <li key={m.label} className="relative group">
              <a
                href={m.href}
                className="font-display uppercase text-sm tracking-wider hover:text-electric transition-colors inline-flex items-center gap-1"
              >
                {m.label}
                {m.items && (
                  <svg
                    className="h-3 w-3 text-bone/50 group-hover:text-electric transition-colors"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
              {/* Hover panel — pt-2 keeps a bridge so the menu doesn't close on the gap */}
              {m.items && (
                <div className="absolute left-0 top-full pt-3 hidden group-hover:block">
                  <div className="min-w-[230px] bg-ink/95 backdrop-blur border-2 border-electric/60 shadow-xl shadow-electric/10">
                    {m.items.map((it, i) => (
                      <a
                        key={it.href + i}
                        href={it.href}
                        className="block px-4 py-3 font-display uppercase tracking-wider text-xs text-bone/80 hover:text-electric hover:bg-electric/5 transition-colors border-b border-bone/5 last:border-b-0"
                      >
                        {it.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
          <li>
            <a
              href="/clients"
              className="font-display uppercase text-sm tracking-wider hover:text-electric transition-colors"
            >
              Client Portal
            </a>
          </li>
          <li>
            <a
              href="/forum"
              className="font-display uppercase text-sm tracking-wider hover:text-electric transition-colors"
            >
              Forum
            </a>
          </li>
          {(me?.isTrainer || me?.role === "admin") && (
            <li>
              <a
                href="/trainers"
                className="font-display uppercase text-sm tracking-wider text-electric hover:text-bone transition-colors"
              >
                Trainers
              </a>
            </li>
          )}
          {me?.role === "admin" && (
            <li>
              <a
                href="/admin"
                className="font-display uppercase text-sm tracking-wider text-electric hover:text-bone transition-colors"
              >
                Admin
              </a>
            </li>
          )}
          {me ? (
            <li className="flex items-center gap-3">
              {!me.portalAccess && me.role !== "admin" && (
                <a
                  href="/#pricing"
                  className="bg-electric text-ink px-4 py-2 font-display uppercase text-xs tracking-wider hover:bg-bone transition-colors"
                >
                  Upgrade
                </a>
              )}
              <a
                href="/account"
                className="font-display uppercase text-xs tracking-wider text-bone/60 hover:text-electric transition-colors"
              >
                {me.username}
              </a>
              <button
                onClick={logout}
                className="border border-bone/30 px-4 py-2 font-display uppercase text-xs tracking-wider hover:border-electric hover:text-electric transition-colors"
              >
                Logout
              </button>
            </li>
          ) : (
            <li>
              <a
                href="/login"
                className="bg-electric text-ink px-5 py-2 font-display uppercase text-sm tracking-wider hover:bg-bone transition-colors"
              >
                Sign In
              </a>
            </li>
          )}
        </ul>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden flex flex-col items-center justify-center gap-1 h-9 w-9 border border-bone/30 hover:border-electric transition-colors"
        >
          <span className={"block h-0.5 w-5 bg-bone transition-transform " + (open ? "translate-y-[6px] rotate-45" : "")} />
          <span className={"block h-0.5 w-5 bg-bone transition-opacity " + (open ? "opacity-0" : "")} />
          <span className={"block h-0.5 w-5 bg-bone transition-transform " + (open ? "-translate-y-[6px] -rotate-45" : "")} />
        </button>
      </nav>

      {open && (
        <nav className="md:hidden flex flex-col px-6 pb-4 border-t border-bone/10 bg-ink/95">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 font-display uppercase tracking-wider text-sm text-bone/80 hover:text-electric transition-colors border-b border-bone/5"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/clients"
            onClick={() => setOpen(false)}
            className="block py-3 font-display uppercase tracking-wider text-sm text-electric hover:text-bone transition-colors border-b border-bone/5"
          >
            Client Portal →
          </a>
          <a
            href="/forum"
            onClick={() => setOpen(false)}
            className="block py-3 font-display uppercase tracking-wider text-sm text-bone/80 hover:text-electric transition-colors border-b border-bone/5"
          >
            Forum →
          </a>
          {(me?.isTrainer || me?.role === "admin") && (
            <a
              href="/trainers"
              onClick={() => setOpen(false)}
              className="block py-3 font-display uppercase tracking-wider text-sm text-electric hover:text-bone transition-colors border-b border-bone/5"
            >
              Trainers →
            </a>
          )}
          {me?.role === "admin" && (
            <a
              href="/admin"
              onClick={() => setOpen(false)}
              className="block py-3 font-display uppercase tracking-wider text-sm text-electric hover:text-bone transition-colors border-b border-bone/5"
            >
              Admin →
            </a>
          )}
          {me ? (
            <button
              onClick={logout}
              className="block w-full text-left py-3 font-display uppercase tracking-wider text-sm text-bone/70 hover:text-electric transition-colors"
            >
              Logout ({me.username})
            </button>
          ) : (
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="block py-3 font-display uppercase tracking-wider text-sm text-electric hover:text-bone transition-colors"
            >
              Sign In →
            </a>
          )}
        </nav>
      )}
    </header>
  );
}
