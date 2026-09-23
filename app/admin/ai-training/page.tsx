"use client";

import { useEffect, useState } from "react";
import Navbar from "../../../src/components/Navbar";
import Footer from "../../../src/components/Footer";
import AICoachTrainingConsole from "../../../src/components/admin/AICoachTrainingConsole";

export default function AITrainingPage() {
  const [state, setState] = useState<"loading" | "allowed" | "forbidden">("loading");

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user?.role === "admin") setState("allowed");
        else setState("forbidden");
      })
      .catch(() => setState("forbidden"));
  }, []);

  useEffect(() => {
    if (state === "forbidden") {
      window.location.replace("/login?from=/admin/ai-training");
    }
  }, [state]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 py-20 text-bone">
        <div className="mx-auto max-w-7xl">
          {state === "loading" ? (
            <p className="font-display uppercase tracking-wider text-sm text-bone/45">
              Loading Coach Training Console…
            </p>
          ) : state === "allowed" ? (
            <AICoachTrainingConsole />
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
