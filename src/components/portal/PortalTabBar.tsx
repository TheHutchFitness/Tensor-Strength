"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Apple, MessageSquare, ClipboardCheck } from "lucide-react";

const TABS = [
  { href: "/clients", label: "Home", Icon: Home, match: (p: string) => p === "/clients" },
  { href: "/clients/workout-log", label: "Workout", Icon: Dumbbell, match: (p: string) => p.startsWith("/clients/workout-log") },
  { href: "/clients/nutrition", label: "Nutrition", Icon: Apple, match: (p: string) => p.startsWith("/clients/nutrition") },
  { href: "/forum", label: "Forum", Icon: MessageSquare, match: (p: string) => p.startsWith("/forum") },
  { href: "/clients/check-in", label: "Check-In", Icon: ClipboardCheck, match: (p: string) => p.startsWith("/clients/check-in") },
];

export default function PortalTabBar() {
  const pathname = usePathname() || "";

  // Reserve space at the bottom on mobile so content isn't hidden behind the
  // fixed bar. Class is removed on unmount (i.e. when leaving the portal).
  useEffect(() => {
    document.body.classList.add("has-portal-tabbar");
    return () => document.body.classList.remove("has-portal-tabbar");
  }, []);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-ink/95 backdrop-blur border-t-2 border-electric"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Portal navigation"
    >
      <div className="mx-auto max-w-lg grid grid-cols-5">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <a
              key={href}
              href={href}
              className={
                "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors " +
                (active ? "text-electric" : "text-bone/55 hover:text-bone")
              }
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              <span className="font-display uppercase tracking-wider text-[9px] leading-none">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
