import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Apply for Coaching — Tensor Strength",
  description:
    "Apply to train with Tensor Strength — remote coaching, in-person training, or a custom program. No account needed to apply.",
};

export default function ApplyPage() {
  return (
    <>
      {/* Minimal public header */}
      <header className="sticky top-0 z-50 bg-ink/80 backdrop-blur text-bone border-b-2 border-electric">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/apply" className="flex items-center gap-3">
            <img
              src="/tensor-strength-logo.jpg"
              alt="Tensor Strength"
              className="h-11 w-11 object-contain rounded-full"
            />
            <span className="font-display uppercase tracking-wider text-sm hidden sm:block">
              Tensor Strength
            </span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/free-programs"
              className="font-display uppercase text-sm tracking-wider text-bone hover:text-electric transition-colors hidden sm:block"
            >
              Free Programs
            </a>
            <a
              href="/login"
              className="bg-electric text-ink px-5 py-2 font-display uppercase text-sm tracking-wider hover:bg-bone transition-colors"
            >
              Member Login
            </a>
          </div>
        </div>
      </header>

      <main className="text-bone min-h-screen">
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
