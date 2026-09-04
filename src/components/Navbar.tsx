"use client";

import { useState } from "react";

const links = [
  { href: "/#about", label: "About" },
  { href: "/#professionals", label: "Professionals" },
  { href: "/#content", label: "Content" },
  { href: "/#programs", label: "Weekly Programs" },
  { href: "/#tools", label: "Free Tools" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#contact", label: "Apply" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

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
              href="/#contact"
              className="bg-electric text-ink px-5 py-2 font-display uppercase text-sm tracking-wider hover:bg-bone transition-colors"
            >
              Start Now
            </a>
          </li>
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
        </ul>
      )}
    </header>
  );
}
