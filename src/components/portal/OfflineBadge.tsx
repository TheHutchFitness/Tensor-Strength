"use client";

import { useEffect, useState } from "react";

export default function OfflineBadge() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-4 z-[75] flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-amber-400 text-ink text-xs font-display uppercase tracking-wider px-4 py-2 shadow-xl animate-[fadeIn_.3s_ease-out]">
        <span className="h-2 w-2 rounded-full bg-ink/70 animate-pulse" />
        Offline — showing saved data
      </div>
    </div>
  );
}
