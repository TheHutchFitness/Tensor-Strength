"use client";

import { useEffect, useState } from "react";
import { Calculator, FileText, MessageSquare, LayoutDashboard, Lock, X } from "lucide-react";

type Me = {
  username?: string;
  portalAccess?: boolean;
  accessType?: string;
  role?: string;
} | null;

const TILES = [
  { href: "/free-tools", label: "Free Tools", desc: "Calculators & trackers", Icon: Calculator },
  { href: "/programs", label: "Free Programs", desc: "Starter training blocks", Icon: FileText },
  { href: "/forum", label: "Community", desc: "Ask, share, get feedback", Icon: MessageSquare },
  { href: "/clients", label: "Client Portal", desc: "Your coaching hub", Icon: LayoutDashboard },
];

const UNLOCKS = ["Client Portal", "Workout log", "Cloud sync", "8-week programs", "Coach check-ins"];

export default function MemberHub() {
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user || null))
      .catch(() => {})
      .finally(() => setLoaded(true));
    try {
      setDismissed(localStorage.getItem("ts_upgrade_dismissed") === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!loaded || !me) return null;

  const hasPortal = !!me.portalAccess;
  const first = (me.username || "").split(/[\s@]/)[0] || "athlete";

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem("ts_upgrade_dismissed", "1");
    } catch {}
  }

  return (
    <section className="border-b border-bone/10 bg-ink/40">
      <div className="mx-auto max-w-6xl px-6 py-8 md:py-10">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-2">
          Your Hub
        </p>
        <h2 className="font-display uppercase text-2xl md:text-3xl font-700 text-bone leading-tight">
          Welcome back, <span className="text-electric capitalize">{first}</span>.
        </h2>

        {/* Quick-access tiles */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TILES.map(({ href, label, desc, Icon }) => {
            const locked = href === "/clients" && !hasPortal;
            return (
              <a
                key={href}
                href={href}
                className="group relative border-2 border-bone/15 hover:border-electric transition-colors bg-ink/50 p-5 flex flex-col"
              >
                <Icon className="h-6 w-6 text-electric mb-3" strokeWidth={1.8} />
                <span className="font-display uppercase tracking-wider text-sm text-bone group-hover:text-electric transition-colors flex items-center gap-2">
                  {label}
                  {locked && <Lock className="h-3.5 w-3.5 text-bone/40" />}
                </span>
                <span className="text-xs text-bone/50 mt-1 leading-snug">{desc}</span>
              </a>
            );
          })}
        </div>

        {/* Upgrade banner for free members */}
        {!hasPortal && !dismissed && (
          <div className="mt-6 relative border-2 border-electric bg-gradient-to-r from-electric/15 to-transparent p-5 pr-12">
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute top-3 right-3 text-bone/40 hover:text-bone transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="font-display uppercase tracking-wider text-sm text-electric">
              You&apos;re on the free plan
            </p>
            <p className="mt-2 text-bone/80 text-sm leading-relaxed max-w-2xl">
              Upgrade to unlock the full system:{" "}
              {UNLOCKS.map((u, i) => (
                <span key={u} className="text-bone">
                  {u}
                  {i < UNLOCKS.length - 1 ? ", " : "."}
                </span>
              ))}
            </p>
            <a
              href="/#pricing"
              className="mt-4 inline-flex bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors"
            >
              Upgrade my account →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
