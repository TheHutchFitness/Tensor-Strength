"use client";

import { useEffect, useRef, useState } from "react";

export default function OfflineBadge() {
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const wasOffline = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => {
      const isOff = typeof navigator !== "undefined" && !navigator.onLine;
      setOffline(isOff);
      if (isOff) {
        wasOffline.current = true;
        setReconnected(false);
      } else if (wasOffline.current) {
        // Just came back online after being offline — flash a confirmation.
        wasOffline.current = false;
        setReconnected(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setReconnected(false), 2800);
      }
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!offline && !reconnected) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-4 z-[75] flex justify-center px-3 pointer-events-none">
      {offline ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-amber-400 text-ink text-xs font-display uppercase tracking-wider px-4 py-2 shadow-xl animate-[fadeIn_.3s_ease-out]">
          <span className="h-2 w-2 rounded-full bg-ink/70 animate-pulse" />
          Offline — showing saved data
        </div>
      ) : (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-emerald-500 text-white text-xs font-display uppercase tracking-wider px-4 py-2 shadow-xl animate-[fadeIn_.3s_ease-out]">
          <span className="leading-none">✓</span>
          Back online — syncing
        </div>
      )}
    </div>
  );
}
