export default function Announcement() {
  return (
    <a
      href="/#fit-effect"
      className="block bg-electric text-ink hover:bg-bone transition-colors"
    >
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-center gap-2 text-center">
        <span className="font-display uppercase tracking-wider text-sm md:text-base font-600">
          ⚡ In-Person Training available exclusively at The Fit Effect
        </span>
        <span aria-hidden className="font-display font-700">→</span>
      </div>
    </a>
  );
}
