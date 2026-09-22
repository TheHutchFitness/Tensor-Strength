"use client";

import { useEffect, useRef, useState } from "react";
import { loginToCheckout } from "../lib/plans";

export default function CheckoutButton({
  packageId,
  className,
  children,
  autoStart = false,
}: {
  packageId: string;
  className?: string;
  children: React.ReactNode;
  autoStart?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function startCheckout() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.assign(loginToCheckout(packageId, true));
        return;
      }
      if (res.status === 409 && data.code === "PLAN_CHANGE_REQUIRED") {
        window.location.assign("/checkout?plan=tensor_ai_beta_12_99");
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.assign(data.url);
    } catch (e: any) {
      setError(e?.message || "Could not open checkout. Try again.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoStart || started.current) return;
    const key = `ts_auto_checkout_${packageId}`;
    if (sessionStorage.getItem(key) === "1") return;
    started.current = true;
    sessionStorage.setItem(key, "1");
    startCheckout();
  }, [autoStart, packageId]);

  return (
    <>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={
          (className || "") + (loading ? " opacity-60 pointer-events-none" : "")
        }
      >
        {loading ? "Opening Stripe…" : children}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-electric leading-relaxed" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
