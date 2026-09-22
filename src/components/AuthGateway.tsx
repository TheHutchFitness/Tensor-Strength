"use client";

type Props = {
  onLogin: () => void;
  onCreateAccount: () => void;
  freeProgramsHref?: string;
};

export default function AuthGateway({
  onLogin,
  onCreateAccount,
  freeProgramsHref = "/free-programs",
}: Props) {
  return (
    <div className="w-full max-w-lg relative overflow-hidden border border-line bg-ink/65 backdrop-blur-xl px-7 py-10 sm:px-10 sm:py-12 text-center">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric to-transparent opacity-80" />
      <span className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-electric/10 blur-3xl" />

      <img
        src="/tensor-strength-logo.jpg"
        alt="Tensor Strength"
        className="relative mx-auto h-24 w-24 rounded-full object-contain"
      />

      <p className="relative mt-6 font-display uppercase tracking-[0.28em] text-[11px] text-electric">
        Tensor Strength
      </p>

      <h1 className="relative mt-3 font-display uppercase text-4xl sm:text-5xl font-700 leading-[0.95] text-bone">
        Train with
        <br />
        <span className="text-electric">purpose.</span>
      </h1>

      <p className="relative mx-auto mt-5 max-w-sm text-sm leading-relaxed text-bone/65">
        Programs, tracking, progress, community, coaching tools and Tensor AI —
        built into one training system.
      </p>

      <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCreateAccount}
          className="bg-electric px-6 py-4 font-display uppercase tracking-wider text-sm text-ink transition-colors hover:bg-bone"
        >
          Create Account
        </button>

        <button
          type="button"
          onClick={onLogin}
          className="border-2 border-bone/30 px-6 py-4 font-display uppercase tracking-wider text-sm text-bone transition-colors hover:border-electric hover:text-electric"
        >
          Log In
        </button>
      </div>

      <a
        href={freeProgramsHref}
        className="relative mt-6 inline-block font-display uppercase tracking-wider text-[11px] text-bone/45 transition-colors hover:text-electric"
      >
        Browse free programs without an account →
      </a>
    </div>
  );
}
