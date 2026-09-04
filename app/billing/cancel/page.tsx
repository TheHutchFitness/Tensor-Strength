"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function BillingCancelPage() {
  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen flex items-center justify-center px-6 py-24">
        <div className="max-w-md w-full text-center">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
            Payment
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            No charge <span className="text-electric">made.</span>
          </h1>
          <p className="mt-5 text-bone/70 leading-relaxed">
            You backed out of checkout — totally fine. Nothing was charged and no
            access was granted. Whenever you&apos;re ready, pick a plan and jump
            in.
          </p>
          <a
            href="/#pricing"
            className="mt-8 inline-block bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
          >
            Back to Pricing →
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
