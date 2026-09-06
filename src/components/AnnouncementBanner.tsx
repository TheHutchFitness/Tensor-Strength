"use client";

import { useEffect, useState } from "react";

export default function AnnouncementBanner() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/announcement")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.enabled && d?.message) {
          const key = "ts-ann-dismissed";
          if (sessionStorage.getItem(key) === String(d.updatedAt)) return;
          setMsg(d.message);
          setShow(true);
          (window as any).__annAt = String(d.updatedAt);
        }
      })
      .catch(() => {});
  }, []);

  if (!show) return null;
  return (
    <div className="relative z-[70] bg-electric text-ink px-4 py-2.5 text-center">
      <p className="font-display uppercase tracking-wider text-xs md:text-sm pr-6">{msg}</p>
      <button
        aria-label="Dismiss"
        onClick={() => {
          try { sessionStorage.setItem("ts-ann-dismissed", (window as any).__annAt || "1"); } catch {}
          setShow(false);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 font-display text-ink/70 hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
