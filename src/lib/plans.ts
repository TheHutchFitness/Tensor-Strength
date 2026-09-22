export const CHECKOUT_PLANS = {
  monthly_9_99: {
    id: "monthly_9_99",
    name: "Membership",
    price: "$9.99 CAD",
    cadence: "/ month",
    blurb: "Full Client Portal. This is the default.",
    cta: "Pay $9.99 CAD/mo",
  },
  custom_program_200: {
    id: "custom_program_200",
    name: "Custom program",
    price: "$200 CAD",
    cadence: "one-time",
    blurb: "A plan built around your lifts and schedule.",
    cta: "Pay $200 CAD",
  },
  remote_coaching_400: {
    id: "remote_coaching_400",
    name: "Remote coaching",
    price: "$400 CAD",
    cadence: "/ month",
    blurb: "Programming, check-ins, portal included.",
    cta: "Pay $400 CAD/mo",
  },
} as const;

export type CheckoutPlanId = keyof typeof CHECKOUT_PLANS;
export const DEFAULT_PLAN: CheckoutPlanId = "monthly_9_99";

export function getPlan(id: string | null | undefined) {
  if (id && id in CHECKOUT_PLANS) return CHECKOUT_PLANS[id as CheckoutPlanId];
  return CHECKOUT_PLANS[DEFAULT_PLAN];
}

export function checkoutPath(planId?: string | null, pay = false) {
  const plan = getPlan(planId);
  const q = new URLSearchParams({ plan: plan.id });
  if (pay) q.set("pay", "1");
  return `/checkout?${q.toString()}`;
}

export function loginToCheckout(planId?: string | null, signup = true) {
  const dest = checkoutPath(planId, true);
  const q = new URLSearchParams();
  if (signup) q.set("signup", "1");
  q.set("from", dest);
  q.set("plan", getPlan(planId).id);
  return `/login?${q.toString()}`;
}
