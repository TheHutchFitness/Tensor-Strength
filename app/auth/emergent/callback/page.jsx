"use client";
import { safeReturnPath } from "../../../../src/lib/workoutMetrics";

import { useEffect, useState } from "react";

export default function EmergentCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      // Emergent returns the identity in the URL fragment: #session_id=xxx
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const sessionId = params.get("session_id");
      if (!sessionId) throw new Error("Sign-in was cancelled or returned no session.");

      const res = await fetch("/api/auth/emergent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Google sign-in failed.");

      // Clear the fragment, then send the user to where they were headed.
      window.history.replaceState({}, document.title, "/auth/emergent/callback");
      const dest = safeReturnPath(sessionStorage.getItem("ts_login_from"));
      sessionStorage.removeItem("ts_login_from");
      window.location.assign(dest);
    }

    complete().catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center text-bone px-6">
      <div className="text-center">
        {error ? (
          <>
            <p className="font-display uppercase tracking-wider text-xl text-electric">Sign-in failed</p>
            <p className="mt-3 text-bone/70">{error}</p>
            <a href="/login" className="mt-6 inline-block border border-electric text-electric px-6 py-3 font-display uppercase tracking-wider text-sm hover:bg-electric hover:text-ink transition-colors">
              Back to login
            </a>
          </>
        ) : (
          <p className="font-display uppercase tracking-[0.3em] text-electric animate-pulse">
            Completing sign-in…
          </p>
        )}
      </div>
    </main>
  );
}
