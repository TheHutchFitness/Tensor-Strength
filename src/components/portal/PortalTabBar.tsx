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

  // Reserve space at the bottom on mobile so content isn't hidden behind the
  // fixed bar. Class is removed on unmount (i.e. when leaving the portal).
  useEffect(() => {
    document.body.classList.add("has-portal-tabbar");
    return () => document.body.classList.remove("has-portal-tabbar");
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

  return (
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
  );
}
