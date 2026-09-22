"use client";

import { useEffect, useState } from "react";
import { Calculator, FileText, MessageSquare, LayoutDashboard, Lock, Sparkles, X } from "lucide-react";
import CheckoutButton from "./CheckoutButton";
import { fetchCurrentUser } from "../lib/currentUser";

type Me = {
  username?: string;
  portalAccess?: boolean;
  accessType?: string;
  subscriptionStatus?: string;
  role?: string;
} | null;

const TILES = [
  { href: "/ai", label: "Tensor AI", desc: "Gym, sport & athletics coach", Icon: Sparkles },
  { href: "/free-tools", label: "Free Tools", desc: "Calculators & trackers", Icon: Calculator },
  { href: "/programs", label: "Free Programs", desc: "Starter training blocks", Icon: FileText },
  { href: "/forum", label: "Community", desc: "Ask, share, get feedback", Icon: MessageSquare },
  { href: "/clients", label: "Client Portal", desc: "Your coaching hub", Icon: LayoutDashboard },
];

const UNLOCKS = ["Client Portal", "Workout log", "Cloud sync", "Hutch Touch program", "Coach check-ins"];

export default function MemberHub() {
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "canceling" | "done" | "error">("idle");
  const [cancelMsg, setCancelMsg] = useState("");

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => setMe(user))
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

  async function cancelSub() {
    setCancelState("canceling");
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelMsg(data.error || "Couldn't cancel — please try again.");
        setCancelState("error");
        return;
      }
      setCancelState("done");
    } catch {
      setCancelMsg("Network error — please try again.");
      setCancelState("error");
    }
  }

  const isSubscribed = hasPortal && me.accessType !== "custom_program";

  return (
    <section className="border-b border-bone/10 bg-ink/40">
      <div className="mx-auto max-w-6xl px-6 py-8 md:py-10">
        <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-2">
          Your Hub
        </p>
        <h2 className="font-display uppercase text-2xl md:text-3xl font-700 text-bone leading-tight">
          Welcome back, <span className="text-electric capitalize">{first}</span>.
        </h2>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <CheckoutButton
                packageId="monthly_9_99"
                className="inline-flex bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors"
              >
                Upgrade my account · $9.99/mo →
              </CheckoutButton>
              <a
                href="/#pricing"
                className="font-display uppercase tracking-wider text-xs text-bone/60 hover:text-electric transition-colors"
              >
                See all plans
              </a>
            </div>
          </div>
        )}

        {!hasPortal && (
          <div className="mt-6 border border-bone/15 bg-ink/40 p-5">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-4">
              Get started
            </p>
            <ul className="space-y-3">
              {[
                { n: "1", t: "Try a free tool", d: "Calculators, macros & trackers", href: "/free-tools" },
                { n: "2", t: "Join the community", d: "Ask questions, share wins", href: "/forum" },
                { n: "3", t: "Unlock the Client Portal", d: "Workout log, programs & check-ins", href: "/#pricing" },
              ].map((s) => (
                <li key={s.n}>
                  <a href={s.href} className="group flex items-center gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-electric text-electric font-display text-sm">
                      {s.n}
                    </span>
                    <span className="flex-1">
                      <span className="font-display uppercase tracking-wider text-sm text-bone group-hover:text-electric transition-colors">
                        {s.t}
                      </span>
                      <span className="block text-xs text-bone/50">{s.d}</span>
                    </span>
                    <span className="text-electric group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isSubscribed && (
          <div className="mt-6 border border-bone/15 bg-ink/40 p-5">
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-2">
              Your Account
            </p>
            {cancelState === "done" ? (
              <p className="text-sm text-bone/80 leading-relaxed">
                Your membership is set to cancel at the end of the current billing period. You&apos;ll
                keep access until then. Changed your mind?{" "}
                <a href="/#pricing" className="text-electric hover:underline">Resubscribe</a>.
              </p>
            ) : (
              <>
                <p className="text-sm text-bone/70 leading-relaxed max-w-2xl">
                  Membership active. You can cancel anytime — you&apos;ll keep access until the end of
                  your current billing period.
                </p>
                {cancelState === "idle" || cancelState === "error" ? (
                  <button
                    onClick={() => setCancelState("confirm")}
                    className="mt-3 border border-bone/25 text-bone/70 px-4 py-2 font-display uppercase tracking-wider text-xs hover:border-red-400 hover:text-red-400 transition-colors"
                  >
                    Cancel subscription
                  </button>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-bone/80">Are you sure?</span>
                    <button
                      onClick={cancelSub}
                      disabled={cancelState === "canceling"}
                      className="bg-red-500 text-ink px-4 py-2 font-display uppercase tracking-wider text-xs hover:bg-red-400 transition-colors disabled:opacity-60"
                    >
                      {cancelState === "canceling" ? "Cancelling…" : "Yes, cancel"}
                    </button>
                    <button
                      onClick={() => setCancelState("idle")}
                      className="border border-bone/25 text-bone/70 px-4 py-2 font-display uppercase tracking-wider text-xs hover:border-bone hover:text-bone transition-colors"
                    >
                      Keep it
                    </button>
                  </div>
                )}
                {cancelState === "error" && (
                  <p className="mt-2 text-xs text-red-400">{cancelMsg}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
