"use client";

import { useEffect, useState } from "react";
import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";
import CheckoutButton from "../../src/components/CheckoutButton";
import UpgradeToAIButton from "../../src/components/UpgradeToAIButton";
import {
  checkoutPath,
  getPlan,
  loginToCheckout,
} from "../../src/lib/plans";

type User = {
  id?: string;
  role?: string;
  isTrainer?: boolean;
  portalAccess?: boolean;
  accessType?: string;
  aiBetaAccess?: boolean;
  stripeSubscriptionId?: string;
} | null;

function alreadyHasPlan(planId: string, user: User) {
  if (!user) return false;

  if (planId === "monthly_9_99") {
    return !!user.portalAccess;
  }

  if (planId === "tensor_ai_beta_12_99") {
    return (
      user.role === "admin" ||
      user.isTrainer === true ||
      user.aiBetaAccess === true ||
      user.accessType === "tensor_ai_beta"
    );
  }

  if (planId === "custom_program_200") {
    return user.accessType === "custom_program";
  }

  if (planId === "remote_coaching_400") {
    return user.accessType === "remote_coaching";
  }

  return false;
}

export default function CheckoutPage() {
  const [planId, setPlanId] = useState("monthly_9_99");
  const [user, setUser] = useState<User>(null);
  const [loaded, setLoaded] = useState(false);
  const [pay, setPay] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = getPlan(params.get("plan"));

    setPlanId(plan.id);
    setPay(params.get("pay") === "1");

    if (params.get("plan") !== plan.id) {
      window.history.replaceState(
        {},
        "",
        checkoutPath(plan.id, params.get("pay") === "1"),
      );
    }

    fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, []);

  const plan = getPlan(planId);
  const already = alreadyHasPlan(plan.id, user);

  const coreToAiUpgrade =
    plan.id === "tensor_ai_beta_12_99" &&
    user?.accessType === "membership" &&
    !!user?.stripeSubscriptionId;

  const incompatibleExistingSubscription =
    plan.id === "tensor_ai_beta_12_99" &&
    !!user?.stripeSubscriptionId &&
    user?.accessType !== "membership" &&
    user?.accessType !== "tensor_ai_beta";

  return (
    <>
      <Navbar />

      <main className="flex min-h-screen items-center justify-center px-6 py-24 text-bone">
        <div className="w-full max-w-md">
          <p className="glow mb-6 font-display uppercase tracking-[0.3em] text-sm text-electric">
            Checkout
          </p>

          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            {plan.name}
            <br />
            <span className="text-electric">{plan.price}</span>
          </h1>

          <p className="mt-2 text-sm text-bone/50">{plan.cadence}</p>
          <p className="mt-5 leading-relaxed text-bone/70">{plan.blurb}</p>

          {plan.id === "tensor_ai_beta_12_99" ? (
            <ul className="mt-6 grid gap-2 text-sm text-bone/65">
              <li>→ Includes Core Membership.</li>
              <li>→ Tensor AI access is a separate entitlement.</li>
              <li>→ Founding beta pricing may change as usage costs become clear.</li>
            </ul>
          ) : (
            <ul className="mt-6 grid gap-2 text-sm text-bone/65">
              <li>→ Prices are shown in CAD.</li>
              <li>→ Promotion codes are entered on Stripe&apos;s secure page.</li>
              <li>→ Subscription plans can be managed from your account.</li>
            </ul>
          )}

          <div className="mt-8">
            {!loaded ? (
              <p className="font-display uppercase tracking-wider text-sm text-bone/50">
                Loading…
              </p>
            ) : !user ? (
              <a
                href={loginToCheckout(plan.id, true)}
                className="block w-full bg-electric px-8 py-4 text-center font-display uppercase tracking-wider text-ink transition-colors hover:bg-bone"
              >
                Create account, then continue
              </a>
            ) : already ? (
              <a
                href={plan.id === "tensor_ai_beta_12_99" ? "/ai" : "/clients"}
                className="block w-full bg-electric px-8 py-4 text-center font-display uppercase tracking-wider text-ink transition-colors hover:bg-bone"
              >
                You already have this access →
              </a>
            ) : coreToAiUpgrade ? (
              <div>
                <UpgradeToAIButton className="w-full bg-electric px-8 py-4 font-display uppercase tracking-wider text-ink transition-colors hover:bg-bone">
                  Upgrade Core → Tensor AI Beta
                </UpgradeToAIButton>
                <p className="mt-3 text-center text-xs leading-relaxed text-bone/50">
                  Tensor AI unlocks immediately. Your recurring rate becomes
                  $12.99 CAD at your next renewal, with no surprise mid-cycle
                  proration charge.
                </p>
              </div>
            ) : incompatibleExistingSubscription ? (
              <div className="border border-electric/35 bg-electric/5 p-5">
                <p className="font-display uppercase tracking-wider text-sm text-electric">
                  Existing coaching / legacy plan
                </p>
                <p className="mt-2 text-sm leading-relaxed text-bone/70">
                  Tensor AI Beta is currently being enabled manually for coaching
                  and legacy subscriptions so we do not accidentally create a
                  second recurring charge.
                </p>
                <a
                  href="/clients"
                  className="mt-4 inline-block font-display uppercase tracking-wider text-xs text-electric hover:text-bone"
                >
                  Return to your portal →
                </a>
              </div>
            ) : (
              <CheckoutButton
                packageId={plan.id}
                autoStart={pay}
                className="w-full bg-electric px-8 py-4 font-display uppercase tracking-wider text-ink transition-colors hover:bg-bone"
              >
                {plan.cta}
              </CheckoutButton>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-bone/40">
            Not this plan?{" "}
            <a href="/#pricing" className="text-electric hover:text-bone">
              Compare options
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
