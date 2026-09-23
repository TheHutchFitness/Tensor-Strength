"use client";

import { useState } from "react";

export default function UpgradeToAIButton({
  className = "",
  children = "Upgrade to Tensor AI Beta →",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState("");

  async function upgrade() {
    if (state === "working") return;

    setState("working");
    setError("");

    try {
      const response = await fetch("/api/subscription/upgrade-ai", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not upgrade your plan.");
      }

      window.location.assign("/ai");
    } catch (err: any) {
      setError(err?.message || "Could not upgrade your plan.");
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={upgrade}
        disabled={state === "working"}
        className={
          className +
          (state === "working" ? " opacity-60 pointer-events-none" : "")
        }
      >
        {state === "working" ? "Updating plan…" : children}
      </button>

      {error ? (
        <p className="mt-2 text-xs leading-relaxed text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
