"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Apple, MessageSquare, ClipboardCheck } from "lucide-react";

const TABS = [
  { href: "/clients", label: "Home", Icon: Home, key: "home", match: (p: string) => p === "/clients" },
  { href: "/clients/workout-log", label: "Workout", Icon: Dumbbell, key: "workout", match: (p: string) => p.startsWith("/clients/workout-log") },
  { href: "/clients/nutrition", label: "Nutrition", Icon: Apple, key: "nutrition", match: (p: string) => p.startsWith("/clients/nutrition") },
  { href: "/forum", label: "Forum", Icon: MessageSquare, key: "forum", match: (p: string) => p.startsWith("/forum") },
  { href: "/clients/check-in", label: "Check-In", Icon: ClipboardCheck, key: "checkin", match: (p: string) => p.startsWith("/clients/check-in") },
];

export default function PortalTabBar() {
  const pathname = usePathname() || "";
  const [unread, setUnread] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Reserve space at the bottom on mobile so content isn't hidden behind the
  // fixed bar. Class is removed on unmount (i.e. when leaving the portal).
  useEffect(() => {
    document.body.classList.add("has-portal-tabbar");
    return () => document.body.classList.remove("has-portal-tabbar");
  }, []);

  // One-time subtle hint that you can swipe between sections (mobile only).
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    try {
      if (localStorage.getItem("ts-swipe-hint-seen")) return;
      localStorage.setItem("ts-swipe-hint-seen", "1");
    } catch {}
    const show = setTimeout(() => setShowHint(true), 1200);
    const hide = setTimeout(() => setShowHint(false), 6800);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  // Poll forum notifications so the Forum tab shows an unread dot.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/forum/notifications");
        if (!r.ok || !alive) return;
        const d = await r.json();
        if (alive) setUnread(d.unread || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    // Refresh when returning to the tab (e.g. after reading on the forum).
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  // Swipe left/right between portal sections on phones.
  useEffect(() => {
    let sx = 0, sy = 0, st = 0, tracking = false;
    const inHorizScroll = (el: Element | null) => {
      let n: Element | null = el;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 4) return true;
        n = n.parentElement;
      }
      return false;
    };
    const onStart = (e: TouchEvent) => {
      if (window.innerWidth >= 768 || e.touches.length !== 1 || inHorizScroll(e.target as Element)) {
        tracking = false;
        return;
      }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      st = Date.now();
      tracking = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st > 700 || Math.abs(dx) < 90 || Math.abs(dy) > 45) return;
      const idx = TABS.findIndex((tb) => tb.match(pathname));
      if (idx === -1) return;
      const next = dx < 0 ? idx + 1 : idx - 1;
      if (next < 0 || next >= TABS.length) return;
      setShowHint(false);
      try { (navigator as any).vibrate?.(15); } catch {}
      window.location.href = TABS[next].href;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pathname]);

  return (
    <>
      {showHint && (
        <div
          className="md:hidden fixed inset-x-0 z-[55] flex justify-center px-4 pointer-events-none"
          style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink/95 backdrop-blur border border-electric/60 text-bone/90 text-xs px-4 py-2 shadow-lg animate-[fadeIn_.3s_ease-out]">
            <span className="text-electric text-sm leading-none">⇆</span>
            <span>Swipe left or right to switch sections</span>
            <button onClick={() => setShowHint(false)} className="ml-1 text-bone/50 hover:text-electric" aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-ink/95 backdrop-blur border-t-2 border-electric"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Portal navigation"
      >
        <div className="mx-auto max-w-lg grid grid-cols-5">
          {TABS.map(({ href, label, Icon, key, match }) => {
            const active = match(pathname);
            const showDot = key === "forum" && unread > 0;
            return (
              <a
                key={href}
                href={href}
                className={
                  "relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors " +
                  (active ? "text-electric" : "text-bone/55 hover:text-bone")
                }
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                  {showDot && (
                    <span
                      className="absolute -top-1 -right-1.5 min-w-[8px] h-2 rounded-full bg-electric ring-2 ring-ink"
                      aria-label={`${unread} unread`}
                    />
                  )}
                </span>
                <span className="font-display uppercase tracking-wider text-[9px] leading-none">{label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
