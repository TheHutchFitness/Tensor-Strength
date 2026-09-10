"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SiteTabBar from "@/components/SiteTabBar";
import CheckoutButton from "@/components/CheckoutButton";

type Me = {
  username?: string;
  email?: string;
  role?: string;
  portalAccess?: boolean;
  accessType?: string;
  subscriptionStatus?: string;
} | null;

type Txn = {
  id: string;
  packageId?: string;
  amount?: number;
  currency?: string;
  accessType?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
};

const PLAN_LABEL: Record<string, string> = {
  monthly_9_99: "Monthly Membership",
  yearly_90: "Annual Membership",
  custom_program_200: "Custom Program",
  remote_coaching_400: "Remote Coaching",
};

const ACCESS_LABEL: Record<string, string> = {
  membership: "Membership",
  monthly: "Monthly Membership",
  yearly: "Annual Membership",
  custom_program: "Custom Program",
  remote_coaching: "Remote Coaching",
  in_person: "In-Person Coaching",
};

function money(cents?: number, currency?: string) {
  if (typeof cents !== "number") return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: (currency || "cad").toUpperCase(),
  }).format(cents / 100);
}

export default function AccountPage() {
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "canceling" | "done" | "error">("idle");
  const [cancelMsg, setCancelMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((d) => setMe(d?.user || null)).catch(() => {}).finally(() => setLoaded(true));
    fetch("/api/billing/history").then((r) => (r.ok ? r.json() : null)).then((d) => d && setTxns(d.transactions || [])).catch(() => {});
  }, []);

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

  const hasPortal = !!me?.portalAccess;
  const isSubscribed = hasPortal && me?.accessType !== "custom_program" && me?.role !== "admin";
  const planName = me?.accessType ? ACCESS_LABEL[me.accessType] || me.accessType : null;

  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
            Account
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight mb-10">
            Your <span className="text-electric">account.</span>
          </h1>

          {!loaded ? (
            <p className="text-bone/50">Loading…</p>
          ) : !me ? (
            <p className="text-bone/70">
              You&apos;re not signed in. <a href="/login" className="text-electric hover:underline">Sign in</a>.
            </p>
          ) : (
            <div className="space-y-10">
              {/* Profile */}
              <div className="border-2 border-bone/15 bg-ink/30 p-6 md:p-8">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-4">Profile</p>
                <dl className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-bone/50">Username</dt>
                    <dd className="font-display uppercase text-lg text-bone mt-1">{me.username}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-bone/50">Email</dt>
                    <dd className="text-bone mt-1 break-all">{me.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-bone/50">Plan</dt>
                    <dd className="text-bone mt-1">{planName || "Free"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-bone/50">Client Portal</dt>
                    <dd className={"mt-1 font-display uppercase text-sm " + (hasPortal ? "text-electric" : "text-bone/50")}>
                      {hasPortal ? "Unlocked ✓" : "Locked"}
                    </dd>
                  </div>
                </dl>
                {!hasPortal && me.role !== "admin" && (
                  <div className="mt-6">
                    <CheckoutButton
                      packageId="monthly_9_99"
                      className="inline-flex bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors"
                    >
                      Upgrade · $9.99/mo →
                    </CheckoutButton>
                  </div>
                )}
              </div>

              {/* Billing history */}
              <div className="border-2 border-bone/15 bg-ink/30 p-6 md:p-8">
                <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-4">Billing History</p>
                {txns.length === 0 ? (
                  <p className="text-bone/50 text-sm">No payments yet.</p>
                ) : (
                  <div className="divide-y divide-bone/10">
                    {txns.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-4 py-3">
                        <div>
                          <p className="font-display uppercase text-sm text-bone">
                            {(t.packageId && PLAN_LABEL[t.packageId]) || (t.accessType && ACCESS_LABEL[t.accessType]) || "Purchase"}
                          </p>
                          <p className="text-xs text-bone/50">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-bone">{money(t.amount, t.currency)}</p>
                          <p className={"text-[10px] uppercase tracking-wider " + (t.paymentStatus === "paid" ? "text-electric" : "text-bone/40")}>
                            {t.paymentStatus || t.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subscription management */}
              {isSubscribed && (
                <div className="border-2 border-bone/15 bg-ink/30 p-6 md:p-8">
                  <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-4">Manage Subscription</p>
                  {cancelState === "done" ? (
                    <p className="text-sm text-bone/80 leading-relaxed">
                      Your membership is set to cancel at the end of the current billing period — you keep
                      access until then. Changed your mind?{" "}
                      <a href="/#pricing" className="text-electric hover:underline">Resubscribe</a>.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-bone/70 leading-relaxed max-w-2xl">
                        You can cancel anytime. You&apos;ll keep full access until the end of your current
                        billing period.
                      </p>
                      {cancelState === "idle" || cancelState === "error" ? (
                        <button
                          onClick={() => setCancelState("confirm")}
                          className="mt-4 border border-bone/25 text-bone/70 px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:border-red-400 hover:text-red-400 transition-colors"
                        >
                          Cancel subscription
                        </button>
                      ) : (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="text-sm text-bone/80">Are you sure?</span>
                          <button
                            onClick={cancelSub}
                            disabled={cancelState === "canceling"}
                            className="bg-red-500 text-ink px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-red-400 transition-colors disabled:opacity-60"
                          >
                            {cancelState === "canceling" ? "Cancelling…" : "Yes, cancel"}
                          </button>
                          <button
                            onClick={() => setCancelState("idle")}
                            className="border border-bone/25 text-bone/70 px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:border-bone hover:text-bone transition-colors"
                          >
                            Keep it
                          </button>
                        </div>
                      )}
                      {cancelState === "error" && <p className="mt-2 text-xs text-red-400">{cancelMsg}</p>}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
      <SiteTabBar />
    </>
  );
}
