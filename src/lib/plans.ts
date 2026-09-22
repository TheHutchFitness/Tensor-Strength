export const CHECKOUT_PLANS = {
  monthly_9_99: {
    id: "monthly_9_99",
    name: "Core Membership",
    price: "$9.99 CAD",
    cadence: "/ month",
    blurb: "The Tensor Strength training system and full Client Portal.",
    cta: "Join Core — $9.99 CAD/mo",
  },
  tensor_ai_beta_12_99: {
    id: "tensor_ai_beta_12_99",
    name: "Tensor AI Beta",
    price: "$12.99 CAD",
    cadence: "/ month",
    blurb: "Core access plus the founding Tensor AI coaching layer.",
    cta: "Join AI Beta — $12.99 CAD/mo",
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
    blurb: "Programming, check-ins, and Client Portal access.",
    cta: "Pay $400 CAD/mo",
  },
} as const;

export type CheckoutPlanId = keyof typeof CHECKOUT_PLANS;
export const DEFAULT_PLAN: CheckoutPlanId = "monthly_9_99";

export function getPlan(id: string | null | undefined) {
  if (id && id in CHECKOUT_PLANS) {
    return CHECKOUT_PLANS[id as CheckoutPlanId];
  }
  return CHECKOUT_PLANS[DEFAULT_PLAN];
}

export function checkoutPath(planId?: string | null, pay = false) {
  const plan = getPlan(planId);
  const query = new URLSearchParams({ plan: plan.id });
  if (pay) query.set("pay", "1");
  return `/checkout?${query.toString()}`;
}

export function loginToCheckout(
  planId?: string | null,
  signup = true,
) {
  const destination = checkoutPath(planId, true);
  const query = new URLSearchParams();
  if (signup) query.set("signup", "1");
  query.set("from", destination);
  query.set("plan", getPlan(planId).id);
  return `/login?${query.toString()}`;
}
