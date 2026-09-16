"use client";

import { useEffect, useState } from "react";
import Navbar from "../../../src/components/Navbar";
import Footer from "../../../src/components/Footer";

export default function BillingSuccessPage() {
  const [state, setState] = useState<"checking" | "paid" | "pending" | "error">(
    "checking"
  );
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setState("error");
      return;
    }
    let stopped = false;
    let attempts = 0;

    async function poll() {
      try {
        const res = await fetch(
          `/api/payments/status?session_id=${encodeURIComponent(sessionId!)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json();
        if (stopped) return;
        if (data.paid) {
          setState("paid");
          setToast(true);
          setTimeout(() => setToast(false), 6000);
          return;
        }
        if (++attempts >= 25) {
          setState("pending");
          return;
        }
        setTimeout(poll, 1500);
      } catch {
        if (!stopped) setTimeout(poll, 2000);
      }
    }
    poll();
    return () => {
      stopped = true;
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen flex items-center justify-center px-6 py-24">
        <div className="max-w-md w-full text-center">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Payment
          </p>

          {state === "checking" && (
            <>
              <h1 className="glow font-display uppercase text-4xl font-700">
                Confirming…
              </h1>
              <p className="mt-5 text-bone/70 leading-relaxed">
                Hang tight — we&apos;re verifying your payment with Stripe. This
                usually takes a few seconds.
              </p>
              <div className="mt-8 h-1 w-full bg-bone/10 overflow-hidden">
                <div className="h-full w-1/3 bg-electric animate-pulse" />
              </div>
            </>
          )}

          {state === "paid" && (
            <>
              <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
                You&apos;re <span className="text-electric">in.</span>
              </h1>
              <div className="mt-8 border-2 border-electric bg-electric/10 p-8">
                <p className="glow font-display uppercase text-lg text-electric">
                  Client Portal unlocked
                </p>
                <p className="mt-3 text-bone/80 text-sm leading-relaxed">
                  Your access is active. Next, take 2 minutes to complete your intake so your
                  coach can tailor your training — then explore the portal.
                </p>
                <a
                  href="/clients/intake"
                  className="mt-6 inline-block w-full bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
                >
                  Complete your intake →
                </a>
              </div>
            </>
          )}

          {state === "pending" && (
            <>
              <h1 className="glow font-display uppercase text-4xl font-700">
                Still processing
              </h1>
              <p className="mt-5 text-bone/70 leading-relaxed">
                Your payment is going through. Give it a moment, then refresh —
                access unlocks automatically once it clears.
              </p>
              <a
                href="/clients"
                className="mt-8 inline-block border-2 border-bone px-8 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone hover:text-ink transition-colors"
              >
                Go to Portal
              </a>
            </>
          )}

          {state === "error" && (
            <>
              <h1 className="glow font-display uppercase text-4xl font-700">
                Hmm.
              </h1>
              <p className="mt-5 text-bone/70 leading-relaxed">
                We couldn&apos;t find a checkout session. If you were charged,
                refresh the portal in a minute — otherwise try again.
              </p>
              <a
                href="/#pricing"
                className="mt-8 inline-block border-2 border-bone px-8 py-3 font-display uppercase tracking-wider text-sm hover:bg-bone hover:text-ink transition-colors"
              >
                Back to Pricing
              </a>
            </>
          )}
        </div>
      </main>

      {/* Unlock confirmation toast */}
      <div
        role="status"
        aria-live="polite"
        className={
          "fixed z-[60] left-1/2 -translate-x-1/2 bottom-6 w-[92%] max-w-sm transition-all duration-500 " +
          (toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none")
        }
      >
        <div className="flex items-center gap-3 border-2 border-electric bg-ink/95 backdrop-blur px-5 py-4 shadow-2xl shadow-electric/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-electric text-ink font-display text-lg">
            ✓
          </span>
          <div>
            <p className="font-display uppercase tracking-wider text-sm text-electric leading-tight">
              Welcome — your portal is unlocked
            </p>
            <p className="text-xs text-bone/70 mt-0.5">
              Everything just opened up. Time to train.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
