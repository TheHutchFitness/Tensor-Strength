import { SOCIAL_CTA_URL } from "../lib/public-links";

const features = [
  {
    icon: "◈",
    title: "Rooms",
    desc: "Dedicated spaces — Athlete's Center, Diet & Health, Form Lab, PR Room, In-Person Coaching, and more.",
  },
  {
    icon: "❖",
    title: "Quests",
    desc: "Training challenges and missions that keep you accountable and moving forward.",
  },
  {
    icon: "☰",
    title: "Rank",
    desc: "Climb the leaderboard, earn XP, and level up from Beginner to elite as you put in the work.",
  },
  {
    icon: "◍",
    title: "Social",
    desc: "Talk with other athletes, share wins, ask questions, and get hype on each other's PRs.",
  },
];

export default function Social() {
  return (
    <section id="social" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 stripe-bg opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          {/* Left: pitch */}
          <div>
            <p className="glow font-display uppercase tracking-[0.3em] text-electric text-sm mb-6">
              The Tensor Strength App
            </p>
            <h2 className="glow font-display uppercase text-4xl md:text-5xl font-700 leading-tight">
              Don&apos;t train
              <br />
              <span className="text-electric">alone.</span>
            </h2>
            <p className="mt-8 text-lg text-bone/80 leading-relaxed max-w-xl">
              The Tensor Strength app is where Tensor Strength athletes ask questions, post PRs, get form checks,
              and talk with people who are putting in the same work. It&apos;s not a comment
              section — it&apos;s a community built around getting stronger together.
            </p>

            {/* Unlock callout */}
            <div className="mt-8 border-2 border-electric bg-electric/10 p-5 max-w-xl">
              <p className="glow font-display uppercase tracking-wider text-electric text-sm mb-2">
                ⚡ Joining unlocks the full trackers
              </p>
              <p className="text-bone/85 leading-relaxed text-sm">
                The free tools on this site are a starting point. Sign into the Tensor Strength app and
                you get the complete, in-depth versions — the full workout log with
                AI-built custom programs, advanced PR tracking with AI breakdowns, the Diet
                &amp; Health nutrition system, Cardio GPS tracking, Form Lab, and more.
                The tools here get you moving. The app gets you all the way there.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a
                href={SOCIAL_CTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-electric text-ink px-8 py-4 font-display uppercase tracking-wider hover:bg-bone transition-colors text-center"
              >
                Get the App →
              </a>
              <a
                href={SOCIAL_CTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-bone px-8 py-4 font-display uppercase tracking-wider hover:bg-bone hover:text-ink transition-colors text-center"
              >
                Sign In
              </a>
            </div>

            <p className="mt-6 text-xs text-bone/50 leading-relaxed max-w-md">
              Free to join. Create an account or sign in with Google to access the rooms,
              quests, and the rest of the community.
            </p>
          </div>

          {/* Right: feature cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="border border-bone/15 bg-ink/30 backdrop-blur-sm p-6 hover:border-electric transition-colors"
              >
                <span className="font-display text-3xl text-electric">{f.icon}</span>
                <p className="font-display uppercase tracking-wider text-bone mt-4">{f.title}</p>
                <p className="text-sm text-bone/60 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
