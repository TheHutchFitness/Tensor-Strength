import Navbar from "../../../src/components/Navbar";
import Footer from "../../../src/components/Footer";
import CheckoutButton from "../../../src/components/CheckoutButton";

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
            Still here. <span className="text-electric">No charge.</span>
          </h1>
          <p className="mt-5 text-bone/70 leading-relaxed">
            Checkout closed before anything billed. The $9.99 membership is the
            default if you want back in.
          </p>
          <CheckoutButton
            packageId="monthly_9_99"
            className="mt-8 inline-block w-full bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors"
          >
            Join — $9.99 CAD/mo
          </CheckoutButton>
          <a
            href="/checkout?plan=monthly_9_99"
            className="mt-4 inline-block text-sm text-bone/50 hover:text-electric"
          >
            Or pick a different plan
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
