"use client";

import { useEffect, useState } from "react";

type Ref = { refereeName: string; status: string; createdAt: string };

export default function AccountReferrals() {
  const [code, setCode] = useState("");
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [credits, setCredits] = useState(0);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await fetch("/api/referrals/me");
    if (res.ok) {
      const d = await res.json();
      setCode(d.code || "");
      setReferredBy(d.referredBy || null);
      setRefs(d.referrals || []);
      setCredits(d.creditsEarned || 0);
    }
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  async function apply() {
    setMsg("");
    const res = await fetch("/api/referrals/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: input }),
    });
    const d = await res.json();
    if (!res.ok) setMsg(d.error || "Couldn't apply that code.");
    else { setMsg("Referral applied — thanks!"); setInput(""); load(); }
  }

  function copy() {
    navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (!loaded) return null;

  return (
    <div className="border-2 border-bone/15 bg-ink/30 p-6 md:p-8">
      <p className="glow font-display uppercase tracking-[0.3em] text-electric text-xs mb-4">Refer a Friend</p>
      <p className="text-sm text-bone/70 leading-relaxed max-w-2xl">
        Share your code. When a friend joins and mentions it, your coach credits your account. It&apos;s our way of saying thanks for spreading the word.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="border border-electric/50 bg-electric/10 px-5 py-3">
          <span className="font-display uppercase tracking-[0.2em] text-electric text-lg">{code}</span>
        </div>
        <button onClick={copy} className="border border-bone/25 text-bone/70 px-4 py-2.5 font-display uppercase tracking-wider text-xs hover:border-electric hover:text-electric transition-colors">
          {copied ? "Copied ✓" : "Copy code"}
        </button>
        <span className="text-sm text-bone/60">Credits earned: <span className="text-electric font-display">{credits}</span></span>
      </div>

      {refs.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-wider text-bone/50 mb-2">People you&apos;ve referred ({refs.length})</p>
          <div className="grid gap-2">
            {refs.map((r, i) => (
              <div key={i} className="flex items-center justify-between border border-bone/10 bg-ink/40 px-3 py-2">
                <span className="text-sm text-bone/80">{r.refereeName}</span>
                <span className={"text-[10px] uppercase tracking-wider px-2 py-0.5 border " + (r.status === "credited" ? "border-electric text-electric" : "border-bone/25 text-bone/50")}>
                  {r.status === "credited" ? "Credited" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!referredBy && (
        <div className="mt-6 border-t border-bone/10 pt-5">
          <p className="text-[11px] uppercase tracking-wider text-bone/50 mb-2">Were you referred? Enter their code</p>
          <div className="flex flex-wrap gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} placeholder="TSXXXXXX"
              className="bg-ink/40 border border-bone/20 px-3 py-2.5 text-bone focus:border-electric outline-none text-sm uppercase tracking-wider" />
            <button onClick={apply} className="bg-electric text-ink px-5 py-2.5 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors">Apply</button>
          </div>
          {msg && <p className="mt-2 text-xs text-bone/70">{msg}</p>}
        </div>
      )}
    </div>
  );
}
