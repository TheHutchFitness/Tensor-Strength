"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "/#about", label: "About" },
  { href: "/#content", label: "Content" },
  { href: "/#programs", label: "Weekly Programs" },
  { href: "/#tools", label: "Free Tools" },
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
