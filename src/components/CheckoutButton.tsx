"use client";

import { useState } from "react";

export default function CheckoutButton({
  packageId,
  className,
  children,
}: {
  packageId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.assign(data.url);
    } catch (e: any) {
      alert(e?.message || "Something went wrong starting checkout.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={startCheckout}
      disabled={loading}
      className={
        (className || "") + (loading ? " opacity-60 pointer-events-none" : "")
      }
    >
      {loading ? "Opening checkout…" : children}
    </button>
  );
}
