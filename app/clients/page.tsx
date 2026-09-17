"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import PortalHeader from "../../src/components/portal/PortalHeader";
import Tour from "../../src/components/portal/Tour";
import Footer from "../../src/components/Footer";
import { clientResources } from "../../src/data/client-resources";
import CheckoutButton from "../../src/components/CheckoutButton";

const PortalHero = dynamic(() => import("../../src/components/portal/PortalHero"));
const OnboardingChecklist = dynamic(() => import("../../src/components/portal/OnboardingChecklist"));
const PRSubmit = dynamic(() => import("../../src/components/PRSubmit"));
const ClientCoaching = dynamic(() => import("../../src/components/portal/ClientCoaching"), {
  loading: () => <p className="mt-6 font-display uppercase tracking-wider text-bone/50 text-sm">Loading your coaching…</p>,
});
const MacroCalculator = dynamic(() => import("../../src/components/tools/MacroCalculator"));
const OneRepMaxCalculator = dynamic(() => import("../../src/components/tools/OneRepMaxCalculator"));
const WilksDotsCalculator = dynamic(() => import("../../src/components/tools/WilksDotsCalculator"));
const PRTracker = dynamic(() => import("../../src/components/tools/PRTracker"));

type Me = { id: string; username: string; email: string; role: string; portalAccess: boolean; accessType?: string; assignedTrainerId?: string; stripeCustomerId?: string; clientProfile?: { goal?: string } | null } | null;

const resources: never[] = [];

export default function ClientPortalPage() {
  const [me, setMe] = useState<Me>(null);
  const [subInfo, setSubInfo] = useState<any>(null);
  const [messageIntent, setMessageIntent] = useState("");
  const [messageContext, setMessageContext] = useState<{ kind?: "workout" | "form_review" | "checkin" | "general"; title?: string; details?: string } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState<"macros" | "1rm" | "wilks" | "pr">("macros");
  const [trial, setTrial] = useState<{ enabled: boolean; days: number; eligible: boolean } | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setMessageIntent(search.get("message") || "");
    const title = search.get("topic") || "";
    if (title) {
      const kind = search.get("context");
      setMessageContext({
        kind: kind === "workout" || kind === "form_review" || kind === "checkin" ? kind : "general",
        title,
        details: search.get("details") || "",
      });
    }
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        window.location.href = "/login?from=/clients";
        return;
      }
      const { user } = await res.json();
      setMe(user);
      setLoading(false);
      fetch("/api/trial-info")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setTrial(d))
        .catch(() => {});
      if (user?.portalAccess) {
        fetch("/api/payments/subscription")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => setSubInfo(d))
          .catch(() => {});
      }
    })().catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  async function openBilling() {
    try {
      const res = await fetch("/api/payments/portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Unable to open billing");
      window.location.assign(data.url);
    } catch (e: any) {
      alert(e?.message || "Unable to open billing portal.");
    }
  }

  return (
    <>
      <PortalHeader />
      <Tour
        id="welcome"
        steps={[
          { title: "Welcome to Tensor Strength", body: "You're in. This is your Client Portal — your programs, tools and a direct line to your coach all live here." },
          { title: "Your coaching", body: "If a coach is assigned to you, their programs, files and a chat thread show up under Your Coaching." },
          { title: "Train & fuel", body: "Use the Workout Tracker to log sessions and the Nutrition Tracker to hit your macros. Check in weekly so your coach can adjust." },
        ]}
      />
      <main className="text-bone min-h-screen">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
          {loadError ? (
            <div role="alert" className="border border-rose-400/40 p-6">We couldn&apos;t load your dashboard.
              <button onClick={() => window.location.reload()} className="ml-3 text-electric underline">Try again</button>
            </div>
          ) : loading ? (
            <p className="text-center font-display uppercase tracking-wider text-bone/50">
              Loading…
            </p>
          ) : !me?.portalAccess ? (
            /* ---------- LOGGED IN BUT NOT APPROVED FOR PORTAL ---------- */
            <div className="max-w-md mx-auto text-center">
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Client Portal
              </p>
              <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
                Almost
                <br />
                <span className="text-electric">there.</span>
              </h1>
              <div className="mt-10 border-2 border-electric bg-electric/10 p-8">
                <p className="glow font-display uppercase text-lg text-electric">
                  Portal access pending
                </p>
                <p className="mt-3 text-bone/80 text-sm leading-relaxed">
                  You&apos;re signed in as{" "}
                  <span className="text-electric font-display uppercase">{me?.username}</span>.
                  Unlock the full Client Portal instantly with a membership — or once
                  Hutch approves your coaching, it opens automatically.
                </p>
              </div>

              {/* Instant self-serve access — plan comparison */}
              <div className="mt-6 grid sm:grid-cols-2 gap-4 text-left">
                {/* Membership */}
                <div className="border-2 border-electric bg-electric/5 p-5 flex flex-col">
                  <p className="font-display uppercase tracking-wider text-electric text-sm">Membership</p>
                  <p className="mt-1 font-display uppercase text-2xl text-bone">$9.99 <span className="text-sm text-bone/50">CAD/mo</span></p>
                  <ul className="mt-3 space-y-1.5 text-xs text-bone/70 flex-1">
                    <li>✓ Full app: workout &amp; nutrition trackers</li>
                    <li>✓ Programs, tools, quests &amp; community</li>
                    <li>✓ Progress photos &amp; body metrics</li>
                    <li className="text-bone/40">— No 1:1 coaching or sessions</li>
                  </ul>
                  <CheckoutButton packageId="monthly_9_99" className="mt-4 w-full bg-electric text-ink px-4 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">
                    Join — $9.99 CAD/mo
                  </CheckoutButton>
                  <CheckoutButton packageId="yearly_90" className="mt-2 w-full border border-electric/60 text-electric px-4 py-2 font-display uppercase tracking-wider text-xs hover:bg-electric hover:text-ink transition-colors">
                    or Annual — $90 CAD/yr (save ~25%)
                  </CheckoutButton>
                </div>

                {/* Remote Coaching */}
                <div className="border-2 border-bone/25 bg-ink/30 p-5 flex flex-col">
                  <p className="font-display uppercase tracking-wider text-bone/80 text-sm">Remote Coaching</p>
                  <p className="mt-1 font-display uppercase text-2xl text-bone">$400 <span className="text-sm text-bone/50">CAD/mo</span></p>
                  <ul className="mt-3 space-y-1.5 text-xs text-bone/70 flex-1">
                    <li>✓ Everything in Membership</li>
                    <li>✓ Custom programming built for you</li>
                    <li>✓ Weekly video check-ins (Google Meet)</li>
                    <li>✓ Form reviews, messaging &amp; accountability</li>
                  </ul>
                  <CheckoutButton packageId="remote_coaching_400" className="mt-4 w-full border-2 border-bone/50 text-bone px-4 py-3 font-display uppercase tracking-wider text-sm hover:border-electric hover:text-electric transition-colors">
                    {trial?.enabled && trial?.eligible ? "First week FREE, then $400 CAD/mo" : "Start — $400 CAD/mo"}
                  </CheckoutButton>
                </div>

                {/* Custom program */}
                <div className="border border-bone/20 bg-ink/20 p-5 flex flex-col sm:col-span-2 sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-display uppercase tracking-wider text-bone/80 text-sm">One-Time Custom Program</p>
                    <p className="mt-1 text-xs text-bone/60">A personalized training plan to run on your own — <span className="text-bone">$200 CAD</span>, one-time.</p>
                  </div>
                  <CheckoutButton packageId="custom_program_200" className="shrink-0 border-2 border-bone px-5 py-2.5 font-display uppercase tracking-wider text-sm hover:bg-bone hover:text-ink transition-colors">
                    Get Custom Program — $200 CAD
                  </CheckoutButton>
                </div>
              </div>

              <p className="mt-3 text-xs text-bone/50 leading-relaxed">
                💳 Have a discount or promo code?{" "}
                <span className="text-bone/70">Enter it at checkout</span> — on the secure payment page,
                click <span className="text-electric">&ldquo;Add promotion code&rdquo;</span> before you pay.
              </p>

              {trial?.enabled && trial?.eligible && (
                <div className="mt-4 border-2 border-electric bg-electric/10 px-5 py-3 text-left">
                  <p className="font-display uppercase tracking-wider text-electric text-xs">
                    🎁 Your first {trial.days} day{trial.days === 1 ? "" : "s"} of Remote Coaching are on us
                  </p>
                  <p className="mt-1 text-xs text-bone/70 leading-relaxed">
                    Try the full platform free. We&apos;ll collect your card up front but won&apos;t charge until the
                    trial ends — cancel anytime before then and you pay nothing.
                  </p>
                </div>
              )}

              <p className="mt-8 text-xs text-bone/50 leading-relaxed">
                Prefer in-person?{" "}
                <a
                  href="/#contact"
                  className="text-electric border-b border-electric hover:text-bone hover:border-bone transition-colors"
                >
                  Apply for coaching
                </a>
                .
              </p>
            </div>
          ) : (
            /* ---------- APPROVED — FULL PORTAL ---------- */
            <div>
              {me?.id && <div className="mb-10"><PortalHero username={me.username} userId={me.id} accessType={me.accessType} hasCoach={!!me.assignedTrainerId} /></div>}
              {me?.id && <OnboardingChecklist intakeDone={!!me?.clientProfile?.goal} userId={me.id} accessType={me.accessType} />}
              <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                Client Portal
              </p>
              <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
                Welcome back.
                <br />
                <span className="text-electric">Let&apos;s work.</span>
              </h1>
              <p className="mt-6 text-bone/80 max-w-xl leading-relaxed">
                {me?.accessType === "remote_coaching"
                  ? "Your custom training, coach communication, form-review workflow and weekly check-ins — in one place."
                  : me?.accessType === "in_person"
                    ? "Your session schedule, training homework, progress and direct coaching support — all in one place."
                    : me?.accessType === "custom_program"
                      ? "Your personalized training plan, workout logging, exercise help and progress tracking — all in one place."
                      : "Choose a training plan, start the next session, use exercise help when you need it, and track the work as you go."}
              </p>

              {me?.stripeCustomerId && (
                <button
                  onClick={openBilling}
                  className="mt-6 inline-block border-2 border-bone/40 text-bone/80 px-6 py-3 font-display uppercase tracking-wider text-sm hover:border-electric hover:text-electric transition-colors"
                >
                  Manage billing &amp; subscription →
                </button>
              )}

              {/* My Membership */}
              {(() => {
                const labels: Record<string, string> = {
                  membership: "Membership · $9.99/mo",
                  custom_program: "Custom Program · $200 (one-time)",
                  remote_coaching: "Remote Coaching · $400/mo",
                  in_person: "In-person / Comped",
                };
                const plan =
                  (me?.accessType && labels[me.accessType]) || "Client Portal Access";
                const sub = subInfo?.subscription;
                const status = sub?.status || (me?.accessType === "custom_program" ? "one-time" : "active");
                const nextDate = sub?.currentPeriodEnd
                  ? new Date(sub.currentPeriodEnd * 1000).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : null;
                const active = ["active", "trialing", "one-time"].includes(status);
                return (
                  <div className="mt-8 border-2 border-electric/40 bg-ink/30 backdrop-blur-sm p-6">
                    <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
                      My Membership
                    </p>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-bone/50">Plan</p>
                        <p className="font-display uppercase tracking-wider text-bone mt-1">{plan}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-bone/50">Status</p>
                        <p
                          className={
                            "font-display uppercase tracking-wider mt-1 " +
                            (active ? "text-electric" : "text-bone/60")
                          }
                        >
                          {status}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-bone/50">
                          {sub?.cancelAtPeriodEnd ? "Access ends" : "Next billing"}
                        </p>
                        <p className="font-display uppercase tracking-wider text-bone mt-1">
                          {nextDate || (me?.accessType === "custom_program" ? "Lifetime" : "—")}
                        </p>
                      </div>
                    </div>
                    {sub?.cancelAtPeriodEnd && (
                      <p className="mt-4 text-xs text-bone/50">
                        Your subscription is set to cancel — access stays active until the date above.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Community Forum */}
              <a
                href="/forum"
                className="mt-8 block border-2 border-electric bg-electric/10 p-6 hover:bg-electric/20 transition-colors"
              >
                <p className="glow font-display uppercase tracking-wider text-electric text-lg">
                  Community Forum →
                </p>
                <p className="mt-2 text-bone/80 text-sm leading-relaxed">
                  Ask questions, post form-check videos, and help other members. Attach
                  photos or videos to any post or reply.
                </p>
              </a>

              {(me.assignedTrainerId || me.accessType === "in_person" || me.accessType === "remote_coaching" || me.accessType === "custom_program") && (
              <div className="mt-14 border-t border-bone/10 pt-12">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                  Your Coaching
                </p>
                <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                  Straight from your <span className="text-electric">coach.</span>
                </h2>
                <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                  Your assigned trainer&apos;s programs, files and a direct line to
                  message them — all in one place.
                </p>
                {me?.id && <ClientCoaching meId={me.id} accessType={me.accessType} initialMessage={messageIntent} initialContext={messageContext} />}
              </div>
              )}

              {/* PR Board submission */}
              <div className="mt-14 border-t border-bone/10 pt-12">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                  Submit a PR
                </p>
                <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                  Hit a <span className="text-electric">PR?</span>
                </h2>
                <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                  Send it through and Hutch will add it to the public PR Board on the next
                  publish. First name, lift, result — that&apos;s it.
                </p>
                <div className="mt-8">
                  <PRSubmit />
                </div>
              </div>

              {/* Client resources */}
              <div className="mt-14 border-t border-bone/10 pt-12">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                  Client Resources
                </p>
                <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                  Guides &amp; <span className="text-electric">downloads.</span>
                </h2>
                <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                  Reference material from Hutch — program guides, orientation docs,
                  and anything else you need to train smart.
                </p>

                {clientResources.length === 0 ? (
                  <div className="mt-8 border-2 border-dashed border-bone/20 bg-ink/20 p-8 text-center">
                    <p className="font-display uppercase tracking-wider text-sm text-bone/50">
                      No resources posted yet
                    </p>
                    <p className="mt-2 text-xs text-bone/40">
                      Check back — Hutch drops new material here as you progress.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-8 grid gap-3">
                    {clientResources.map((r) => (
                      <li key={r.url}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-4 border border-bone/15 bg-ink/30 backdrop-blur-sm p-5 hover:border-electric transition-colors"
                        >
                          <span className="font-display text-2xl text-electric shrink-0">📕</span>
                          <span className="min-w-0">
                            <span className="font-display uppercase tracking-wider text-bone block">
                              {r.title}
                            </span>
                            <span className="text-sm text-bone/60 mt-1 block leading-relaxed">
                              {r.description}
                            </span>
                            <span className="mt-3 inline-block font-display uppercase tracking-wider text-xs text-electric group-hover:text-bone transition-colors">
                              Open PDF →
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Client tools */}

              <div id="tools" className="mt-14 border-t border-bone/10 pt-12 scroll-mt-24">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
                  Client Tools
                </p>
                <h2 className="glow font-display uppercase text-3xl md:text-4xl font-700 leading-tight">
                  Log the <span className="text-electric">work.</span>
                </h2>
                <p className="mt-4 text-bone/70 leading-relaxed max-w-xl">
                  The full toolkit — clients only. Calculators to estimate your
                  maxes and scores, a PR tracker, the workout log, and a macro
                  calculator. Everything saves to your account and syncs across your devices.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 mb-8">
                  {[
                    { href: "/clients/workout-log", label: "Workout Log", icon: "🏋️" },
                    { href: "/clients/my-programs", label: "My Programs", icon: "📋" },
                    { href: "/clients/nutrition", label: "Nutrition", icon: "🍎" },
                    { href: "/clients/progress", label: "Progress", icon: "📈" },
                    { href: "/clients/calendar", label: "Calendar", icon: "🗓️" },
                    { href: "/clients/check-in", label: "Check-In", icon: "✅" },
                    ...((me?.accessType === "remote_coaching" || me?.accessType === "in_person") ? [{ href: "/clients/book", label: "Book", icon: "💻" }] : []),
                    { href: "/quests", label: "Quests", icon: "🏆" },
                  ].map((t) => (
                    <a
                      key={t.href}
                      href={t.href}
                      className="flex flex-col items-center justify-center gap-1.5 border border-bone/15 bg-ink/30 py-4 hover:border-electric hover:bg-electric/5 transition-colors"
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <span className="font-display uppercase tracking-wider text-xs text-bone/80 text-center">{t.label}</span>
                    </a>
                  ))}
                </div>

                <p className="font-display uppercase tracking-wider text-xs text-bone/50 mb-2">Quick calculators</p>
                <div className="flex flex-wrap gap-2 mb-6 border-b border-bone/15 pb-2">
                  {([
                    { id: "macros", label: "Macro Calculator" },
                    { id: "1rm", label: "1-Rep Max" },
                    { id: "wilks", label: "Wilks & DOTS" },
                    { id: "pr", label: "PR Tracker" },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTool(t.id)}
                      className={
                        "px-5 py-3 font-display uppercase tracking-wider text-sm transition-colors " +
                        (tool === t.id
                          ? "bg-electric text-ink"
                          : "text-bone/60 hover:text-electric border border-transparent hover:border-bone/20")
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="bg-ink/20 border border-bone/10 p-6 md:p-10">
                  {tool === "macros" && <MacroCalculator />}
                  {tool === "1rm" && <OneRepMaxCalculator />}
                  {tool === "wilks" && <WilksDotsCalculator />}
                  {tool === "pr" && <PRTracker />}
                </div>
              </div>

              {/* Weekly check-in — moved to its own page (/clients/check-in) */}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
