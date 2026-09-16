import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";
import MacroCalculator from "../../src/components/tools/MacroCalculator";

export default function MacrosPage() {
  return (
    <>
      <Navbar />
      <main className="text-bone min-h-screen">
        <div className="mx-auto max-w-4xl px-6 py-12 md:py-20">
          <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-4">
            Free Tool
          </p>
          <h1 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
            Macro <span className="text-electric">calculator.</span>
          </h1>
          <p className="mt-4 text-bone/70 leading-relaxed max-w-2xl">
            Dial in your daily calories and macros for your goal — no sign-up
            needed. Free for everyone.
          </p>

          <div className="mt-10 bg-ink/20 border border-bone/10 p-6 md:p-10">
            <MacroCalculator />
          </div>

          <div className="mt-10 border-t border-bone/10 pt-8">
            <p className="text-bone/60 leading-relaxed">
              Want the full toolkit — workout tracker, PR board, exercise
              library and coaching?
            </p>
            <a
              href="/login"
              className="mt-4 inline-block bg-electric text-ink px-6 py-3 font-display uppercase tracking-wider hover:bg-bone transition-colors"
            >
              Sign in / Join →
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
