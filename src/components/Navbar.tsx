"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "/#about", label: "About" },
  { href: "/#professionals", label: "Professionals" },
  { href: "/#content", label: "Content" },
  { href: "/#programs", label: "Weekly Programs" },
  { href: "/#tools", label: "Free Tools" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#contact", label: "Apply" },
];

type Me = { username: string; role: string; portalAccess: boolean } | null;

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

        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-display uppercase text-sm tracking-wider hover:text-electric transition-colors"
              >
                {l.label}
              </a>
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
              <span className="font-display uppercase text-xs tracking-wider text-bone/60">
                {me.username}
              </span>
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
          className="md:hidden font-display uppercase text-sm tracking-wider"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {open && (
        <ul className="md:hidden flex flex-col gap-1 px-6 pb-4 border-t border-bone/10">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 font-display uppercase tracking-wider hover:text-electric"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/clients"
              onClick={() => setOpen(false)}
              className="block py-3 font-display uppercase tracking-wider text-electric"
            >
              Client Portal →
            </a>
          </li>
          {me?.role === "admin" && (
            <li>
              <a
                href="/admin"
                onClick={() => setOpen(false)}
                className="block py-3 font-display uppercase tracking-wider text-electric"
              >
                Admin →
              </a>
            </li>
          )}
          <li>
            {me ? (
              <button
                onClick={logout}
                className="block w-full text-left py-3 font-display uppercase tracking-wider text-bone/70"
              >
                Logout ({me.username})
              </button>
            ) : (
              <a
                href="/login"
                onClick={() => setOpen(false)}
                className="block py-3 font-display uppercase tracking-wider"
              >
                Sign In →
              </a>
            )}
          </li>
        </ul>
      )}
    </header>
  );
}
