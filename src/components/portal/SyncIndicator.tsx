"use client";

import { useEffect, useRef, useState } from "react";

export default function SyncIndicator() {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onSaved = () => {
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 1800);
    };
    window.addEventListener("ts-cloud-saved", onSaved);
    return () => {
      window.removeEventListener("ts-cloud-saved", onSaved);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-16 right-3 z-[74] pointer-events-none">
      <div className="flex items-center gap-1.5 rounded-full bg-ink/95 backdrop-blur border border-emerald-500/60 text-emerald-400 text-[11px] font-display uppercase tracking-wider px-3 py-1.5 shadow-lg animate-[fadeIn_.25s_ease-out]">
        <span className="leading-none">✓</span>
        Saved
      </div>
    </div>
  );
}
