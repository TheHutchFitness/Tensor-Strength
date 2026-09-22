"use client";

import { useEffect, useState } from "react";
import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";
import CheckoutButton from "../../src/components/CheckoutButton";
import { checkoutPath, getPlan, loginToCheckout } from "../../src/lib/plans";

export default function CheckoutPage() {
  const [planId, setPlanId] = useState("monthly_9_99");
  const [status, setStatus] = useState<"loading" | "out" | "in" | "member">("loading");
  const [pay, setPay] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = getPlan(params.get("plan"));
    setPlanId(plan.id);
    setPay(params.get("pay") === "1");
    if (params.get("plan") !== plan.id) {
      window.history.replaceState({}, "", checkoutPath(plan.id, params.get("pay") === "1"));
    }
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.portalAccess) setStatus("member");
        else if (data?.user) setStatus("in");
        else setStatus("out");
      })
      .catch(() => setStatus("out"));
  }, []);

  const plan = getPlan(planId);

  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen flex items-center justify-center px-6 py-24">
        <div className="max-w-md w-full">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Checkout
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            {plan.name}
            <br />
            <span className="text-electric">{plan.price}</span>
          </h1>
          <p className="mt-2 text-sm text-bone/50">{plan.cadence}</p>
          <p className="mt-5 text-bone/70 leading-relaxed">{plan.blurb}</p>

          <ul className="mt-6 grid gap-2 text-sm text-bone/65">
            <li>→ CAD. Promo code field is on the Stripe page.</li>
            <li>→ Portal unlocks as soon as payment confirms.</li>
            <li>→ Membership is cancel-anytime. Coaching is optional.</li>
          </ul>

          <div className="mt-8">
            {status === "loading" ? (
              <p className="font-display uppercase tracking-wider text-sm text-bone/50">Loading…</p>
            ) : status === "member" ? (
              <a
                href="/clients"
                className="block w-full text-center bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
              >
                You already have access →
              </a>
            ) : status === "in" ? (
              <CheckoutButton
                packageId={plan.id}
                autoStart={pay}
                className="w-full bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
              >
                {plan.cta}
              </CheckoutButton>
            ) : (
              <a
                href={loginToCheckout(plan.id, true)}
                className="block w-full text-center bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
              >
                Create account, then pay
              </a>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-bone/40">
            Not this one?{" "}
            <a href="/#pricing" className="text-electric hover:text-bone">
              See all options
            </a>
            {plan.id !== "monthly_9_99" ? (
              <>
                {" "}&middot;{" "}
                <a href={checkoutPath("monthly_9_99")} className="text-electric hover:text-bone">
                  Membership $9.99/mo
                </a>
              </>
            ) : null}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
